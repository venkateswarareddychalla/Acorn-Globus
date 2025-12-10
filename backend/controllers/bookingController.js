
import db from "../models/database.js";
import { calculateTotal } from "../utils/priceCalculator.js";

// Generate unique booking reference
const generateBookingReference = () => {
  return 'BK' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
};

// Atomic availability check with transaction support
export const checkAvailabilityWithTransaction = (courtId, startTime, endTime, coachId, equipmentItems) => {
  const transaction = db.transaction(() => {
    // Check court availability
    const courtStmt = db.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE court_id = ? AND status = 'confirmed' AND
      NOT (end_time <= ? OR start_time >= ?)
    `);
    const courtConflict = courtStmt.get(courtId, startTime, endTime);
    if (courtConflict.count > 0) return false;

    // Check maintenance blocks
    const maintenanceStmt = db.prepare(`
      SELECT COUNT(*) as count FROM maintenance_blocks
      WHERE court_id = ? AND
      NOT (end_time <= ? OR start_time >= ?)
    `);
    const maintenanceConflict = maintenanceStmt.get(courtId, startTime, endTime);
    if (maintenanceConflict.count > 0) return false;

    // Check coach availability if selected
    if (coachId) {
      const coachStmt = db.prepare(`
        SELECT COUNT(*) as count FROM bookings
        WHERE coach_id = ? AND status = 'confirmed' AND
        NOT (end_time <= ? OR start_time >= ?)
      `);
      const coachConflict = coachStmt.get(coachId, startTime, endTime);
      if (coachConflict.count > 0) return false;

      // Check coach unavailability
      const coachUnavailabilityStmt = db.prepare(`
        SELECT COUNT(*) as count FROM coach_unavailability
        WHERE coach_id = ? AND date = ? AND
        NOT (? >= end_time OR ? <= start_time)
      `);
      const bookingDate = new Date(startTime).toISOString().split('T')[0];
      const unavailabilityConflict = coachUnavailabilityStmt.get(
        coachId, 
        bookingDate, 
        startTime, 
        endTime
      );
      if (unavailabilityConflict.count > 0) return false;
    }

    // Check equipment availability for each item
    if (equipmentItems && equipmentItems.length > 0) {
      for (const item of equipmentItems) {
        const equipmentStmt = db.prepare(`
          SELECT available_stock FROM equipment WHERE id = ? AND is_active = 1
        `);
        const equipment = equipmentStmt.get(item.equipmentId);
        if (!equipment || equipment.available_stock < item.quantity) {
          return false;
        }
      }
    }

    return true;
  });

  return transaction();
};

export const getFacilities = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT f.*, 
        COUNT(c.id) as total_courts,
        COUNT(CASE WHEN c.is_active = 1 THEN 1 END) as active_courts
      FROM facilities f
      LEFT JOIN courts c ON f.id = c.facility_id
      GROUP BY f.id
      ORDER BY f.name
    `);
    const facilities = stmt.all();
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCourts = (req, res) => {
  try {
    const { facilityId } = req.query;
    let stmt, params = [];
    
    if (facilityId) {
      stmt = db.prepare(`
        SELECT c.*, f.name as facility_name, f.address
        FROM courts c
        JOIN facilities f ON c.facility_id = f.id
        WHERE c.facility_id = ? AND c.is_active = 1
        ORDER BY c.name
      `);
      params = [facilityId];
    } else {
      stmt = db.prepare(`
        SELECT c.*, f.name as facility_name, f.address
        FROM courts c
        JOIN facilities f ON c.facility_id = f.id
        WHERE c.is_active = 1
        ORDER BY f.name, c.name
      `);
    }
    
    const courts = stmt.all(...params);
    res.json(courts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoaches = (req, res) => {
  try {
    const { facilityId } = req.query;
    let stmt, params = [];
    
    if (facilityId) {
      stmt = db.prepare(`
        SELECT c.*, f.name as facility_name
        FROM coaches c
        JOIN facilities f ON c.facility_id = f.id
        WHERE c.facility_id = ? AND c.available = 1
        ORDER BY c.name
      `);
      params = [facilityId];
    } else {
      stmt = db.prepare(`
        SELECT c.*, f.name as facility_name
        FROM coaches c
        JOIN facilities f ON c.facility_id = f.id
        WHERE c.available = 1
        ORDER BY f.name, c.name
      `);
    }
    
    const coaches = stmt.all(...params);
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEquipment = (req, res) => {
  try {
    const { facilityId } = req.query;
    let stmt, params = [];
    
    if (facilityId) {
      stmt = db.prepare(`
        SELECT e.*, f.name as facility_name
        FROM equipment e
        JOIN facilities f ON e.facility_id = f.id
        WHERE e.facility_id = ? AND e.is_active = 1
        ORDER BY e.name
      `);
      params = [facilityId];
    } else {
      stmt = db.prepare(`
        SELECT e.*, f.name as facility_name
        FROM equipment e
        JOIN facilities f ON e.facility_id = f.id
        WHERE e.is_active = 1
        ORDER BY f.name, e.name
      `);
    }
    
    const equipment = stmt.all(...params);
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const checkAvailability = (courtId, startTime, endTime, coachId) => {
  // Simplified overlap check: booking conflicts if any existing booking overlaps
  const courtStmt = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE court_id = ? AND status = 'confirmed' AND
    NOT (end_time <= ? OR start_time >= ?)
  `);
  const courtConflict = courtStmt.get(courtId, startTime, endTime);
  if (courtConflict.count > 0) return false;

  // Check coach availability if selected
  if (coachId) {
    const coachStmt = db.prepare(`
      SELECT COUNT(*) as count FROM bookings
      WHERE coach_id = ? AND status = 'confirmed' AND
      NOT (end_time <= ? OR start_time >= ?)
    `);
    const coachConflict = coachStmt.get(coachId, startTime, endTime);
    if (coachConflict.count > 0) return false;
  }

  return true;
};

const checkEquipmentStock = (equipmentCount, startTime, endTime) => {
  const stmt = db.prepare("SELECT total_stock FROM equipment WHERE id = 1"); // Assuming single equipment type
  const equipment = stmt.get();
  const bookedStmt = db.prepare(`
    SELECT SUM(equipment_count) as booked FROM bookings
    WHERE status = 'confirmed' AND NOT (end_time <= ? OR start_time >= ?)
  `);
  const booked = bookedStmt.get(startTime, endTime);
  return (equipment.total_stock - (booked.booked || 0)) >= equipmentCount;
};

export const getAvailableSlots = (req, res) => {
  const { courtId, date } = req.query; // date in YYYY-MM-DD
  try {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    // Get all bookings for the court on that date
    const stmt = db.prepare(`
      SELECT start_time, end_time FROM bookings
      WHERE court_id = ? AND status = 'confirmed' AND
      start_time >= ? AND start_time < ?
    `);
    const bookings = stmt.all(courtId, startOfDay.toISOString(), endOfDay.toISOString());

    // Generate slots from 9am to 9pm in 1-hour intervals
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      const start = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00.000Z`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const isBooked = bookings.some(b => {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        return (bStart < end && bEnd > start);
      });
      slots.push({ start: start.toISOString(), end: end.toISOString(), available: !isBooked });
    }

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const calculatePrice = (req, res) => {
  const { courtId, startTime, endTime, equipmentCount, coachId } = req.body;
  try {
    // Get pricing rules
    const rulesStmt = db.prepare("SELECT * FROM pricing_rules");
    const rules = rulesStmt.all();

    // Get court base price
    const courtStmt = db.prepare("SELECT base_price FROM courts WHERE id = ?");
    const court = courtStmt.get(courtId);

    // Get equipment price (assuming single equipment type for now)
    let equipmentPrice = 0;
    if (equipmentCount > 0) {
      const equipmentStmt = db.prepare("SELECT price_per_unit FROM equipment WHERE id = 1");
      const equipment = equipmentStmt.get();
      equipmentPrice = equipment.price_per_unit;
    }

    // Get coach price if selected
    let coachPrice = 0;
    if (coachId) {
      const coachStmt = db.prepare("SELECT price FROM coaches WHERE id = ?");
      const coach = coachStmt.get(coachId);
      coachPrice = coach.price;
    }

    // Calculate total price
    const bookingTime = new Date(startTime);
    const totalPrice = calculateTotal(court.base_price, rules, bookingTime, equipmentCount, equipmentPrice, coachPrice);

    res.json({ totalPrice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const createBookingWithTransaction = (req, res) => {
  const { courtId, startTime, endTime, equipmentItems = [], coachId, paymentMethod = 'pending' } = req.body;
  const userId = req.userId;
  const bookingReference = generateBookingReference();

  try {
    const result = db.transaction(() => {
      // Check availability atomically
      const isAvailable = checkAvailabilityWithTransaction(courtId, startTime, endTime, coachId, equipmentItems);
      if (!isAvailable) {
        throw new Error("Resources not available");
      }

      // Get court and facility info
      const courtInfoStmt = db.prepare(`
        SELECT c.*, c.facility_id, f.name as facility_name 
        FROM courts c 
        JOIN facilities f ON c.facility_id = f.id 
        WHERE c.id = ?
      `);
      const courtInfo = courtInfoStmt.get(courtId);
      if (!courtInfo) {
        throw new Error("Court not found");
      }

      // Get pricing rules for this facility and court type
      const pricingStmt = db.prepare(`
        SELECT * FROM pricing_rules 
        WHERE (facility_id = ? OR facility_id IS NULL) 
        AND (court_type = ? OR court_type IS NULL) 
        AND is_active = 1
      `);
      const pricingRules = pricingStmt.all(courtInfo.facility_id, courtInfo.type);

      // Calculate pricing components
      const bookingTime = new Date(startTime);
      let equipmentCost = 0;
      let equipmentBreakdown = [];

      // Calculate equipment costs
      for (const item of equipmentItems) {
        const equipmentStmt = db.prepare(`
          SELECT price_per_unit FROM equipment WHERE id = ? AND is_active = 1
        `);
        const equipment = equipmentStmt.get(item.equipmentId);
        if (equipment) {
          const itemCost = equipment.price_per_unit * item.quantity;
          equipmentCost += itemCost;
          equipmentBreakdown.push({
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            pricePerUnit: equipment.price_per_unit,
            totalCost: itemCost
          });
        }
      }

      // Get coach price if selected
      let coachCost = 0;
      if (coachId) {
        const coachStmt = db.prepare("SELECT price FROM coaches WHERE id = ?");
        const coach = coachStmt.get(coachId);
        coachCost = coach ? coach.price : 0;
      }

      // Calculate total price with pricing rules
      const totalPrice = calculateTotal(
        courtInfo.base_price, 
        pricingRules, 
        bookingTime, 
        equipmentBreakdown.reduce((sum, item) => sum + item.quantity, 0),
        equipmentCost > 0 ? equipmentCost / equipmentBreakdown.reduce((sum, item) => sum + item.quantity, 0) : 0,
        coachCost
      );

      // Create booking with all details
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (
          booking_reference, user_id, facility_id, court_id, 
          start_time, end_time, coach_id, total_price, base_price,
          equipment_cost, coach_cost, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const bookingResult = bookingStmt.run(
        bookingReference, userId, courtInfo.facility_id, courtId,
        startTime, endTime, coachId, totalPrice, courtInfo.base_price,
        equipmentCost, coachCost, paymentMethod === 'pending' ? 'pending' : 'paid'
      );

      const bookingId = bookingResult.lastInsertRowid;

      // Add equipment items to bookings_equipment table
      for (const item of equipmentBreakdown) {
        const bookingEquipmentStmt = db.prepare(`
          INSERT INTO bookings_equipment (booking_id, equipment_id, quantity, price_per_unit)
          VALUES (?, ?, ?, ?)
        `);
        bookingEquipmentStmt.run(bookingId, item.equipmentId, item.quantity, item.pricePerUnit);

        // Update equipment available stock
        const updateStockStmt = db.prepare(`
          UPDATE equipment SET available_stock = available_stock - ?
          WHERE id = ? AND available_stock >= ?
        `);
        const stockResult = updateStockStmt.run(item.quantity, item.equipmentId, item.quantity);
        if (stockResult.changes === 0) {
          throw new Error(`Insufficient stock for equipment ID: ${item.equipmentId}`);
        }
      }

      // Update user profile stats
      const updateUserProfileStmt = db.prepare(`
        UPDATE user_profiles 
        SET total_bookings = total_bookings + 1, total_spent = total_spent + ?
        WHERE user_id = ?
      `);
      updateUserProfileStmt.run(totalPrice, userId);

      return {
        bookingId,
        bookingReference,
        totalPrice,
        equipmentBreakdown,
        courtInfo
      };
    });

    res.status(201).json({
      success: true,
      booking: result
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Legacy function for backward compatibility
export const createBooking = createBookingWithTransaction;


export const getUserBookings = (req, res) => {
  const userId = req.userId;
  try {
    const stmt = db.prepare(`
      SELECT b.*, 
        c.name as court_name, c.type as court_type,
        f.name as facility_name, f.address,
        co.name as coach_name,
        p.payment_status, p.payment_method, p.transaction_id
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN coaches co ON b.coach_id = co.id
      LEFT JOIN payments p ON b.payment_id = p.id
      WHERE b.user_id = ?
      ORDER BY b.start_time DESC
    `);
    const bookings = stmt.all(userId);
    
    // Get equipment breakdown for each booking
    const enhancedBookings = bookings.map(booking => {
      const equipmentStmt = db.prepare(`
        SELECT be.*, e.name as equipment_name, e.type as equipment_type
        FROM bookings_equipment be
        JOIN equipment e ON be.equipment_id = e.id
        WHERE be.booking_id = ?
      `);
      const equipment = equipmentStmt.all(booking.id);
      
      return {
        ...booking,
        equipment: equipment
      };
    });
    
    res.json(enhancedBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const cancelBookingWithRefund = (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.userId;

  try {
    const result = db.transaction(() => {
      // Get booking details
      const bookingStmt = db.prepare(`
        SELECT b.*, p.id as payment_id, p.amount as paid_amount, p.payment_status
        FROM bookings b
        LEFT JOIN payments p ON b.payment_id = p.id
        WHERE b.id = ? AND b.user_id = ? AND b.status = 'confirmed'
      `);
      const booking = bookingStmt.get(id, userId);
      
      if (!booking) {
        throw new Error("Booking not found or already cancelled");
      }

      // Check cancellation policy (e.g., no refunds for same-day cancellations)
      const bookingDate = new Date(booking.start_time);
      const now = new Date();
      const hoursDifference = (bookingDate - now) / (1000 * 60 * 60);
      
      let refundAmount = 0;
      let refundPercentage = 100;
      
      if (hoursDifference < 2) {
        refundPercentage = 0; // No refund for same-day cancellations
      } else if (hoursDifference < 24) {
        refundPercentage = 50; // 50% refund for same-week cancellations
      }

      refundAmount = (booking.total_price * refundPercentage) / 100;

      // Update booking status
      const updateBookingStmt = db.prepare(`
        UPDATE bookings 
        SET status = 'cancelled', cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `);
      const bookingResult = updateBookingStmt.run(reason || 'User cancellation', id, userId);
      
      if (bookingResult.changes === 0) {
        throw new Error("Failed to cancel booking");
      }

      // Release equipment back to available stock
      const equipmentStmt = db.prepare(`
        SELECT equipment_id, quantity FROM bookings_equipment WHERE booking_id = ?
      `);
      const equipmentItems = equipmentStmt.all(id);
      
      for (const item of equipmentItems) {
        const updateStockStmt = db.prepare(`
          UPDATE equipment SET available_stock = available_stock + ?
          WHERE id = ?
        `);
        updateStockStmt.run(item.quantity, item.equipment_id);
      }

      // Process refund if applicable
      if (refundAmount > 0 && booking.payment_status === 'paid') {
        // Create refund payment record
        const refundPaymentStmt = db.prepare(`
          INSERT INTO payments (
            booking_id, user_id, amount, payment_method, payment_status, 
            transaction_id, payment_gateway, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        
        const refundTransactionId = 'RF' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
        refundPaymentStmt.run(
          id, userId, refundAmount, 'refund', 'completed', 
          refundTransactionId, 'internal'
        );

        // Update original booking payment status
        if (booking.payment_id) {
          const updatePaymentStmt = db.prepare(`
            UPDATE payments SET payment_status = 'refunded' WHERE id = ?
          `);
          updatePaymentStmt.run(booking.payment_id);
        }
      }

      // Update user profile
      const updateUserProfileStmt = db.prepare(`
        UPDATE user_profiles 
        SET total_spent = total_spent - ?
        WHERE user_id = ?
      `);
      updateUserProfileStmt.run(refundAmount, userId);

      return {
        bookingId: id,
        refundAmount,
        refundPercentage,
        cancelledAt: new Date().toISOString()
      };
    });

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      refund: result
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Legacy function for backward compatibility
export const cancelBooking = cancelBookingWithRefund;

// Profile management endpoints

export const getUserProfile = (req, res) => {
  const userId = req.userId;
  try {
    const userStmt = db.prepare("SELECT * FROM users WHERE id = ?");
    const user = userStmt.get(userId);
    
    const profileStmt = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?");
    const profile = profileStmt.get(userId);
    
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      },
      profile: profile || {
        membership_type: 'standard',
        total_bookings: 0,
        total_spent: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const updateUserProfile = (req, res) => {
  const userId = req.userId;
  const { name, phone, date_of_birth, emergency_contact, preferences, membership_type } = req.body;

  try {
    const result = db.transaction(() => {
      // Update user info
      const updateUserStmt = db.prepare(`
        UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      updateUserStmt.run(name, phone, userId);

      // Update or create profile
      const existingProfileStmt = db.prepare("SELECT id FROM user_profiles WHERE user_id = ?");
      const existingProfile = existingProfileStmt.get(userId);

      if (existingProfile) {
        const updateProfileStmt = db.prepare(`
          UPDATE user_profiles 
          SET date_of_birth = ?, emergency_contact = ?, preferences = ?, membership_type = ?
          WHERE user_id = ?
        `);
        updateProfileStmt.run(
          date_of_birth, 
          emergency_contact, 
          JSON.stringify(preferences || {}), 
          membership_type, 
          userId
        );
      } else {
        const createProfileStmt = db.prepare(`
          INSERT INTO user_profiles (user_id, date_of_birth, emergency_contact, preferences, membership_type)
          VALUES (?, ?, ?, ?, ?)
        `);
        createProfileStmt.run(
          userId,
          date_of_birth,
          emergency_contact,
          JSON.stringify(preferences || {}),
          membership_type || 'standard'
        );
      }
    });

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
