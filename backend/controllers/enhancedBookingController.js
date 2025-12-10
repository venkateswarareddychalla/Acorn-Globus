import db from "../models/database.js";
import { calculateTotal } from "../utils/priceCalculator.js";

// Utility function to generate unique booking reference
const generateBookingReference = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `BK-${timestamp}-${randomStr}`.toUpperCase();
};

// Enhanced availability check with atomic locking
export const checkAvailabilityWithLock = (courtId, startTime, endTime, coachId = null) => {
  const courtLock = db.prepare("SELECT id FROM courts WHERE id = ? AND is_active = 1");
  const court = courtLock.get(courtId);
  if (!court) return { available: false, reason: "Court not found or inactive" };

  // Check court availability
  const courtBookingCheck = db.prepare(`
    SELECT COUNT(*) as count FROM bookings 
    WHERE court_id = ? AND status IN ('confirmed', 'pending') AND
    NOT (end_time <= ? OR start_time >= ?)
  `);
  const courtConflict = courtBookingCheck.get(courtId, startTime, endTime);
  if (courtConflict.count > 0) return { available: false, reason: "Court already booked for this time" };

  // Check maintenance blocks
  const maintenanceCheck = db.prepare(`
    SELECT COUNT(*) as count FROM maintenance_blocks 
    WHERE court_id = ? AND NOT (end_time <= ? OR start_time >= ?)
  `);
  const maintenanceConflict = maintenanceCheck.get(courtId, startTime, endTime);
  if (maintenanceConflict.count > 0) return { available: false, reason: "Court is under maintenance" };

  // Check coach availability if selected
  if (coachId) {
    const coachBookingCheck = db.prepare(`
      SELECT COUNT(*) as count FROM bookings 
      WHERE coach_id = ? AND status IN ('confirmed', 'pending') AND
      NOT (end_time <= ? OR start_time >= ?)
    `);
    const coachConflict = coachBookingCheck.get(coachId, startTime, endTime);
    if (coachConflict.count > 0) return { available: false, reason: "Coach not available for this time" };

    // Check coach unavailability
    const coachUnavailabilityCheck = db.prepare(`
      SELECT COUNT(*) as count FROM coach_unavailability 
      WHERE coach_id = ? AND date = ? AND 
      (start_time IS NULL OR end_time IS NULL OR NOT (? >= end_time OR ? <= start_time))
    `);
    const coachUnavailable = coachUnavailabilityCheck.get(
      coachId, 
      startTime.split('T')[0], 
      startTime.split('T')[1], 
      endTime.split('T')[1]
    );
    if (coachUnavailable.count > 0) return { available: false, reason: "Coach marked unavailable" };
  }

  return { available: true, reason: null };
};

// Check equipment availability across multiple items
export const checkEquipmentAvailability = (equipmentItems, startTime, endTime) => {
  const errors = [];
  
  for (const item of equipmentItems) {
    const equipmentCheck = db.prepare(`
      SELECT e.available_stock, SUM(be.quantity) as booked_quantity
      FROM equipment e
      LEFT JOIN bookings_equipment be ON e.id = be.equipment_id
      LEFT JOIN bookings b ON be.booking_id = b.id
      WHERE e.id = ? AND e.is_active = 1 AND (b.status IS NULL OR b.status = 'confirmed') AND
      (b.start_time IS NULL OR NOT (b.end_time <= ? OR b.start_time >= ?))
      GROUP BY e.id, e.available_stock
    `);
    
    const result = equipmentCheck.get(item.equipmentId, startTime, endTime);
    if (!result) {
      errors.push(`Equipment ${item.equipmentId} not found or inactive`);
      continue;
    }
    
    const currentlyBooked = result.booked_quantity || 0;
    const available = result.available_stock - currentlyBooked;
    
    if (available < item.quantity) {
      errors.push(`Insufficient ${item.equipmentId}: only ${available} available, ${item.quantity} requested`);
    }
  }
  
  return { available: errors.length === 0, errors };
};


// Atomic booking creation with transaction
export const createBookingAtomic = async (bookingData) => {
  const {
    userId, courtId, startTime, endTime, coachId = null, 
    equipmentItems = [], paymentMethod = 'credit_card'
  } = bookingData;

  // Use default guest user if no userId provided (for anonymous bookings)
  const finalUserId = userId || 1;

  // Start transaction
  const transaction = db.transaction(() => {
    // Check availability
    const availability = checkAvailabilityWithLock(courtId, startTime, endTime, coachId);
    if (!availability.available) {
      throw new Error(`Booking failed: ${availability.reason}`);
    }

    // Check equipment availability
    if (equipmentItems.length > 0) {
      const equipmentCheck = checkEquipmentAvailability(equipmentItems, startTime, endTime);
      if (!equipmentCheck.available) {
        throw new Error(`Booking failed: ${equipmentCheck.errors.join(', ')}`);
      }
    }

    // Get facility ID from court
    const courtStmt = db.prepare("SELECT facility_id, base_price FROM courts WHERE id = ?");
    const court = courtStmt.get(courtId);
    if (!court) throw new Error("Court not found");

    // Get pricing rules for facility
    const rulesStmt = db.prepare("SELECT * FROM pricing_rules WHERE (facility_id = ? OR facility_id IS NULL) AND is_active = 1");
    const rules = rulesStmt.all(court.facility_id);

    // Calculate equipment costs
    let equipmentCost = 0;
    const equipmentDetails = [];
    for (const item of equipmentItems) {
      const equipmentStmt = db.prepare("SELECT price_per_unit FROM equipment WHERE id = ?");
      const equipment = equipmentStmt.get(item.equipmentId);
      if (equipment) {
        const itemCost = equipment.price_per_unit * item.quantity;
        equipmentCost += itemCost;
        equipmentDetails.push({
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          pricePerUnit: equipment.price_per_unit
        });
      }
    }

    // Get coach cost if selected
    let coachCost = 0;
    if (coachId) {
      const coachStmt = db.prepare("SELECT price FROM coaches WHERE id = ?");
      const coach = coachStmt.get(coachId);
      if (coach) coachCost = coach.price;
    }

    // Calculate total price
    const bookingTime = new Date(startTime);
    const totalPrice = calculateTotal(
      court.base_price, 
      rules, 
      bookingTime, 
      equipmentItems.reduce((sum, item) => sum + item.quantity, 0),
      equipmentItems.length > 0 ? equipmentItems[0].pricePerUnit || 0 : 0,
      coachCost
    );


    // Generate booking reference
    const bookingReference = generateBookingReference();

    // Create booking record first (without payment_id)
    const bookingStmt = db.prepare(`
      INSERT INTO bookings (
        booking_reference, user_id, facility_id, court_id, start_time, end_time, 
        coach_id, total_price, base_price, equipment_cost, coach_cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const bookingResult = bookingStmt.run(
      bookingReference, finalUserId, court.facility_id, courtId, startTime, endTime,
      coachId, totalPrice, court.base_price, equipmentCost, coachCost
    );
    const bookingId = bookingResult.lastInsertRowid;

    // Create payment record with booking ID
    const paymentStmt = db.prepare(`
      INSERT INTO payments (booking_id, user_id, amount, payment_method, payment_status)
      VALUES (?, ?, ?, ?, 'pending')
    `);
    const paymentResult = paymentStmt.run(bookingId, finalUserId, totalPrice, paymentMethod);
    const paymentId = paymentResult.lastInsertRowid;

    // Update booking record with payment ID
    const updateBookingStmt = db.prepare("UPDATE bookings SET payment_id = ? WHERE id = ?");
    updateBookingStmt.run(paymentId, bookingId);

    // Create booking equipment records
    if (equipmentDetails.length > 0) {
      const equipmentBookingStmt = db.prepare(`
        INSERT INTO bookings_equipment (booking_id, equipment_id, quantity, price_per_unit)
        VALUES (?, ?, ?, ?)
      `);
      for (const equipment of equipmentDetails) {
        equipmentBookingStmt.run(bookingId, equipment.equipmentId, equipment.quantity, equipment.pricePerUnit);
      }
    }

    // Update user profile statistics
    const updateProfileStmt = db.prepare(`
      UPDATE user_profiles 
      SET total_bookings = total_bookings + 1, total_spent = total_spent + ?
      WHERE user_id = ?
    `);
    updateProfileStmt.run(totalPrice, finalUserId);

    return {
      bookingId,
      bookingReference,
      totalPrice,
      paymentId
    };
  });

  try {
    return transaction();
  } catch (error) {
    throw error;
  }
};

// Get facilities with court details
export const getFacilities = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT f.*, 
        COUNT(c.id) as court_count,
        GROUP_CONCAT(c.name, ', ') as court_names
      FROM facilities f
      LEFT JOIN courts c ON f.id = c.facility_id AND c.is_active = 1
      GROUP BY f.id
    `);
    const facilities = stmt.all();
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get courts by facility
export const getCourtsByFacility = (req, res) => {
  const { facilityId } = req.params;
  try {
    const stmt = db.prepare(`
      SELECT c.*, f.name as facility_name, f.address as facility_address
      FROM courts c
      JOIN facilities f ON c.facility_id = f.id
      WHERE c.facility_id = ? AND c.is_active = 1
    `);
    const courts = stmt.all(facilityId);
    res.json(courts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get enhanced available slots with maintenance and conflicts
export const getAvailableSlotsEnhanced = (req, res) => {
  const { courtId, date } = req.query;
  try {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Get all bookings for the court on that date
    const bookingsStmt = db.prepare(`
      SELECT start_time, end_time FROM bookings
      WHERE court_id = ? AND status IN ('confirmed', 'pending') AND
      start_time >= ? AND start_time < ?
    `);
    const bookings = bookingsStmt.all(courtId, startOfDay.toISOString(), endOfDay.toISOString());

    // Get maintenance blocks
    const maintenanceStmt = db.prepare(`
      SELECT start_time, end_time FROM maintenance_blocks
      WHERE court_id = ? AND NOT (end_time <= ? OR start_time >= ?)
    `);
    const maintenanceBlocks = maintenanceStmt.all(courtId, startOfDay.toISOString(), endOfDay.toISOString());

    // Generate slots from 6am to 10pm in 30-minute intervals
    const slots = [];
    for (let hour = 6; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const start = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z`);
        const end = new Date(start.getTime() + 30 * 60 * 1000); // 30-minute slots
        
        const isBooked = bookings.some(b => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return (bStart < end && bEnd > start);
        });

        const isMaintenance = maintenanceBlocks.some(m => {
          const mStart = new Date(m.start_time);
          const mEnd = new Date(m.end_time);
          return (mStart < end && mEnd > start);
        });

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          available: !isBooked && !isMaintenance,
          reason: isBooked ? 'Booked' : isMaintenance ? 'Maintenance' : null
        });
      }
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Process payment and confirm booking
export const processPayment = async (req, res) => {
  const { bookingId, paymentMethod, transactionId, gatewayResponse } = req.body;
  
  const transaction = db.transaction(() => {
    // Get booking and payment details
    const bookingStmt = db.prepare(`
      SELECT b.*, p.id as payment_record_id 
      FROM bookings b 
      JOIN payments p ON b.payment_id = p.id 
      WHERE b.id = ?
    `);
    const booking = bookingStmt.get(bookingId);
    
    if (!booking) throw new Error("Booking not found");
    if (booking.payment_status === 'paid') throw new Error("Booking already paid");

    // Simulate payment processing (in real app, integrate with payment gateway)
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for demo

    // Update payment record
    const paymentUpdateStmt = db.prepare(`
      UPDATE payments 
      SET payment_status = ?, transaction_id = ?, gateway_response = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const bookingUpdateStmt = db.prepare(`
      UPDATE bookings 
      SET payment_status = ?, status = ? 
      WHERE id = ?
    `);

    if (paymentSuccess) {
      paymentUpdateStmt.run('completed', transactionId, JSON.stringify(gatewayResponse), booking.payment_record_id);
      bookingUpdateStmt.run('paid', 'confirmed', bookingId);
      
      return { success: true, status: 'confirmed', message: 'Payment successful, booking confirmed' };
    } else {
      paymentUpdateStmt.run('failed', transactionId, JSON.stringify(gatewayResponse), booking.payment_record_id);
      bookingUpdateStmt.run('failed', 'cancelled', bookingId);
      
      return { success: false, status: 'cancelled', message: 'Payment failed, booking cancelled' };
    }
  });

  try {
    const result = transaction();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cancel booking with refund calculation

export const cancelBookingWithRefund = async (req, res) => {
  const { id } = req.params;
  const { reason, refundMethod = 'original' } = req.body;
  const userId = req.userId;

  const transaction = db.transaction(() => {
    // Get booking details
    const bookingStmt = db.prepare(`
      SELECT b.*, p.payment_status, p.amount, p.payment_method
      FROM bookings b 
      JOIN payments p ON b.payment_id = p.id 
      WHERE b.id = ? AND b.user_id = ?
    `);
    const booking = bookingStmt.get(id, userId);
    
    if (!booking) throw new Error("Booking not found or not authorized");
    if (booking.status === 'cancelled') throw new Error("Booking already cancelled");

    // Calculate refund amount based on cancellation policy
    const bookingTime = new Date(booking.start_time);
    const now = new Date();
    const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);
    
    let refundPercentage = 0;
    if (hoursUntilBooking >= 24) {
      refundPercentage = 1.0; // Full refund
    } else if (hoursUntilBooking >= 2) {
      refundPercentage = 0.5; // 50% refund
    } else {
      refundPercentage = 0.0; // No refund
    }
    
    const refundAmount = booking.amount * refundPercentage;

    // Update booking status
    const bookingUpdateStmt = db.prepare(`
      UPDATE bookings 
      SET status = 'cancelled', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    bookingUpdateStmt.run(reason || 'User cancellation', id);

    // Update payment status if refund applies
    if (refundAmount > 0) {
      const paymentUpdateStmt = db.prepare(`
        UPDATE payments 
        SET payment_status = 'refunded', gateway_response = ?
        WHERE id = ?
      `);
      paymentUpdateStmt.run(JSON.stringify({
        refundAmount,
        refundMethod,
        refundPercentage,
        reason: 'Booking cancellation'
      }), booking.payment_id);
    }

    // Update user profile
    const profileUpdateStmt = db.prepare(`
      UPDATE user_profiles 
      SET total_bookings = total_bookings - 1, total_spent = total_spent - ?
      WHERE user_id = ?
    `);
    profileUpdateStmt.run(booking.amount, userId);

    return {
      bookingId: id,
      refundAmount,
      refundPercentage,
      originalAmount: booking.amount,
      status: 'cancelled'
    };
  });

  try {
    const result = transaction();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get user profile

export const getUserProfile = (req, res) => {
  const userId = req.userId;
  try {
    const userStmt = db.prepare("SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?");
    const user = userStmt.get(userId);
    
    const profileStmt = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?");
    const profile = profileStmt.get(userId);
    
    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user profile

export const updateUserProfile = (req, res) => {
  const userId = req.userId;
  const { name, phone, dateOfBirth, emergencyContact, preferences, membershipType } = req.body;

  const transaction = db.transaction(() => {
    // Update user basic info
    const userUpdateStmt = db.prepare("UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    userUpdateStmt.run(name, phone, userId);

    // Update or insert profile
    const profileCheckStmt = db.prepare("SELECT id FROM user_profiles WHERE user_id = ?");
    const profileExists = profileCheckStmt.get(userId);
    
    if (profileExists) {
      const profileUpdateStmt = db.prepare(`
        UPDATE user_profiles 
        SET date_of_birth = ?, emergency_contact = ?, preferences = ?, membership_type = ?
        WHERE user_id = ?
      `);
      profileUpdateStmt.run(
        dateOfBirth, 
        emergencyContact, 
        JSON.stringify(preferences || {}), 
        membershipType, 
        userId
      );
    } else {
      const profileInsertStmt = db.prepare(`
        INSERT INTO user_profiles (user_id, date_of_birth, emergency_contact, preferences, membership_type)
        VALUES (?, ?, ?, ?, ?)
      `);
      profileInsertStmt.run(
        userId, 
        dateOfBirth, 
        emergencyContact, 
        JSON.stringify(preferences || {}), 
        membershipType || 'standard'
      );
    }
  });

  try {
    transaction();
    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
