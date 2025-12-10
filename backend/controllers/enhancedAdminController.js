import db from "../models/database.js";
import { validators, formatValidationError, validationMessages } from "../utils/validators.js";

// Maintenance block management

export const createMaintenanceBlock = (req, res) => {
  const { facilityId, courtId, startTime, endTime, reason } = req.body;
  const adminId = req.userId;

  // Validation
  if (!validators.positiveInt(courtId)) {
    return res.status(400).json(formatValidationError('courtId', validationMessages.required('Court ID')));
  }
  if (!validators.date(startTime) || !validators.date(endTime)) {
    return res.status(400).json(formatValidationError('time', validationMessages.invalid('Start/End time')));
  }
  if (new Date(endTime) <= new Date(startTime)) {
    return res.status(400).json(formatValidationError('time', validationMessages.invalidRange('Time range')));
  }
  if (!validators.nonEmptyString(reason)) {
    return res.status(400).json(formatValidationError('reason', validationMessages.required('Reason')));
  }

  try {
    // Validate that court belongs to facility if facilityId provided
    if (facilityId && courtId) {
      const courtCheck = db.prepare("SELECT facility_id FROM courts WHERE id = ?");
      const court = courtCheck.get(courtId);
      if (!court || court.facility_id !== facilityId) {
        return res.status(400).json({ error: "Court does not belong to specified facility" });
      }
    }

    // Check for conflicts with existing bookings
    const conflictCheck = db.prepare(`
      SELECT COUNT(*) as count FROM bookings 
      WHERE court_id = ? AND status IN ('confirmed', 'pending') AND
      NOT (end_time <= ? OR start_time >= ?)
    `);
    const conflicts = conflictCheck.get(courtId, startTime, endTime);
    
    if (conflicts.count > 0) {
      return res.status(400).json({ 
        error: "Cannot create maintenance block: existing bookings conflict with this time period",
        conflicting_bookings: conflicts.count
      });
    }

    const stmt = db.prepare(`
      INSERT INTO maintenance_blocks (facility_id, court_id, start_time, end_time, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(facilityId, courtId, startTime, endTime, reason, adminId);
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      message: "Maintenance block created successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMaintenanceBlocks = (req, res) => {
  const { facilityId, courtId, startDate, endDate } = req.query;
  
  try {
    let query = `
      SELECT mb.*, 
        f.name as facility_name,
        c.name as court_name,
        u.name as created_by_name
      FROM maintenance_blocks mb
      LEFT JOIN facilities f ON mb.facility_id = f.id
      LEFT JOIN courts c ON mb.court_id = c.id
      LEFT JOIN users u ON mb.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (facilityId) {
      query += " AND mb.facility_id = ?";
      params.push(facilityId);
    }
    if (courtId) {
      query += " AND mb.court_id = ?";
      params.push(courtId);
    }
    if (startDate) {
      query += " AND DATE(mb.start_time) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND DATE(mb.end_time) <= ?";
      params.push(endDate);
    }

    query += " ORDER BY mb.start_time DESC";
    
    const stmt = db.prepare(query);
    const blocks = stmt.all(...params);
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const updateMaintenanceBlock = (req, res) => {
  const { id } = req.params;
  const { startTime, endTime, reason } = req.body;

  try {
    // Check if maintenance block exists
    const blockCheck = db.prepare("SELECT * FROM maintenance_blocks WHERE id = ?");
    const block = blockCheck.get(id);
    if (!block) {
      return res.status(404).json({ error: "Maintenance block not found" });
    }

    // Check for conflicts with existing bookings if times are being updated
    if (startTime !== block.start_time || endTime !== block.end_time) {
      const conflictCheck = db.prepare(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE court_id = ? AND status IN ('confirmed', 'pending') AND
        NOT (end_time <= ? OR start_time >= ?)
      `);
      const conflicts = conflictCheck.get(block.court_id, startTime, endTime);
      
      if (conflicts.count > 0) {
        return res.status(400).json({ 
          error: "Cannot update maintenance block: existing bookings conflict with new time period" 
        });
      }
    }

    const stmt = db.prepare(`
      UPDATE maintenance_blocks 
      SET start_time = ?, end_time = ?, reason = ?
      WHERE id = ?
    `);
    const result = stmt.run(startTime, endTime, reason, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Maintenance block not found" });
    }
    
    res.json({ message: "Maintenance block updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMaintenanceBlock = (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare("DELETE FROM maintenance_blocks WHERE id = ?");
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Maintenance block not found" });
    }
    
    res.json({ message: "Maintenance block deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bulk slot creation for automated scheduling
export const createBulkSlots = (req, res) => {
  const { 
    facilityId, 
    courtIds, 
    startDate, 
    endDate, 
    startTime, 
    endTime, 
    slotDuration = 60, 

    repeatPattern = 'daily' 
  } = req.body;
  const adminId = req.userId;

  try {
    // Validate inputs
    if (!facilityId || !courtIds || !Array.isArray(courtIds) || courtIds.length === 0) {
      return res.status(400).json({ error: "Facility ID and court IDs are required" });
    }

    if (!startDate || !endDate || !startTime || !endTime) {
      return res.status(400).json({ error: "Start date, end date, start time, and end time are required" });
    }

    const transaction = db.transaction(() => {
      const createdSlots = [];
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);

      while (currentDate <= endDateObj) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if date matches repeat pattern
        let shouldCreateSlot = false;
        if (repeatPattern === 'daily') {
          shouldCreateSlot = true;
        } else if (repeatPattern === 'weekdays') {
          const dayOfWeek = currentDate.getDay();
          shouldCreateSlot = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
        } else if (repeatPattern === 'weekends') {
          const dayOfWeek = currentDate.getDay();
          shouldCreateSlot = dayOfWeek === 0 || dayOfWeek === 6; // Saturday or Sunday
        }

        if (shouldCreateSlot) {
          // Create slots for each court
          for (const courtId of courtIds) {
            // Check if slot conflicts with existing bookings
            const slotStartTime = `${dateStr}T${startTime}:00.000Z`;
            const slotEndTime = `${dateStr}T${endTime}:00.000Z`;
            
            const conflictCheck = db.prepare(`
              SELECT COUNT(*) as count FROM bookings 
              WHERE court_id = ? AND status IN ('confirmed', 'pending') AND
              NOT (end_time <= ? OR start_time >= ?)
            `);
            const conflicts = conflictCheck.get(courtId, slotStartTime, slotEndTime);
            
            if (conflicts.count === 0) {
              // Create maintenance block to reserve the slot
              const stmt = db.prepare(`
                INSERT INTO maintenance_blocks (facility_id, court_id, start_time, end_time, reason, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
              `);
              const result = stmt.run(
                facilityId, 
                courtId, 
                slotStartTime, 
                slotEndTime, 
                `Bulk slot creation - ${repeatPattern} pattern`,
                adminId
              );
              createdSlots.push({
                id: result.lastInsertRowid,
                courtId,
                startTime: slotStartTime,
                endTime: slotEndTime
              });
            }
          }
        }

        // Move to next day based on repeat pattern
        if (repeatPattern === 'daily') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (repeatPattern === 'weekdays') {
          currentDate.setDate(currentDate.getDate() + 1);
          // Skip weekends
          while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        } else if (repeatPattern === 'weekends') {
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
          // Skip weekdays
          while (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      }

      return createdSlots;
    });

    const createdSlots = transaction();
    res.json({ 
      message: `Created ${createdSlots.length} bulk slots successfully`,
      slots: createdSlots
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Coach scheduling and assignment
export const scheduleCoach = (req, res) => {
  const { coachId, date, startTime, endTime, reason, type = 'unavailable' } = req.body;
  
  try {
    // Validate coach exists
    const coachCheck = db.prepare("SELECT id FROM coaches WHERE id = ?");
    const coach = coachCheck.get(coachId);
    if (!coach) {
      return res.status(404).json({ error: "Coach not found" });
    }

    const stmt = db.prepare(`
      INSERT INTO coach_unavailability (coach_id, date, start_time, end_time, reason)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(coachId, date, startTime, endTime, reason || `${type} scheduled by admin`);
    
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      message: "Coach schedule updated successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCoachSchedule = (req, res) => {
  const { coachId, startDate, endDate } = req.query;
  
  try {
    let query = `
      SELECT cu.*, c.name as coach_name, c.specialization
      FROM coach_unavailability cu
      JOIN coaches c ON cu.coach_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (coachId) {
      query += " AND cu.coach_id = ?";
      params.push(coachId);
    }
    if (startDate) {
      query += " AND cu.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND cu.date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY cu.date DESC, cu.start_time DESC";
    
    const stmt = db.prepare(query);
    const schedule = stmt.all(...params);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Equipment inventory management
export const updateEquipmentStock = (req, res) => {
  const { id } = req.params;
  const { totalStock, availableStock, pricePerUnit } = req.body;
  
  try {
    const stmt = db.prepare(`
      UPDATE equipment 
      SET total_stock = ?, available_stock = ?, price_per_unit = ?
      WHERE id = ?
    `);
    const result = stmt.run(totalStock, availableStock, pricePerUnit, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    
    res.json({ message: "Equipment stock updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getEquipmentInventory = (req, res) => {
  const { facilityId } = req.query;
  
  try {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        COALESCE(SUM(be.quantity), 0) as currently_booked,
        (e.available_stock - COALESCE(SUM(be.quantity), 0)) as effective_available
      FROM equipment e
      LEFT JOIN bookings_equipment be ON e.id = be.equipment_id
      LEFT JOIN bookings b ON be.booking_id = b.id AND b.status = 'confirmed'
      WHERE (? IS NULL OR e.facility_id = ?)
      GROUP BY e.id
      ORDER BY e.type, e.name
    `);
    const inventory = stmt.all(facilityId, facilityId);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// User management
export const getAllUsers = (req, res) => {
  const { role, membershipType, limit = 50, offset = 0 } = req.query;
  
  try {
    let query = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.created_at,
        up.membership_type, up.total_bookings, up.total_spent,
        COUNT(b.id) as recent_bookings
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN bookings b ON u.id = b.user_id AND DATE(b.created_at) >= DATE('now', '-30 days')
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += " AND u.role = ?";
      params.push(role);
    }
    if (membershipType) {
      query += " AND up.membership_type = ?";
      params.push(membershipType);
    }

    query += " GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const stmt = db.prepare(query);
    const users = stmt.all(...params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUserRole = (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  try {
    if (!['user', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
    const result = stmt.run(role, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ message: "User role updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Court and facility management
export const toggleCourtStatus = (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  
  try {
    const stmt = db.prepare("UPDATE courts SET is_active = ? WHERE id = ?");
    const result = stmt.run(isActive ? 1 : 0, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Court not found" });
    }
    
    res.json({ 
      message: `Court ${isActive ? 'activated' : 'deactivated'} successfully`,
      isActive 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new facility
export const createFacility = (req, res) => {
  const { name, address, phone, email, description, operating_hours_start, operating_hours_end } = req.body;

  // Validation
  if (!validators.nonEmptyString(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.required('Facility name')));
  }
  if (!validators.nonEmptyString(address)) {
    return res.status(400).json(formatValidationError('address', validationMessages.required('Address')));
  }
  if (phone && !validators.phone(phone)) {
    return res.status(400).json(formatValidationError('phone', validationMessages.invalid('Phone number')));
  }
  if (email && !validators.email(email)) {
    return res.status(400).json(formatValidationError('email', validationMessages.invalid('Email')));
  }
  if (operating_hours_start && !validators.time(operating_hours_start)) {
    return res.status(400).json(formatValidationError('operating_hours_start', validationMessages.invalidFormat('Opening time')));
  }
  if (operating_hours_end && !validators.time(operating_hours_end)) {
    return res.status(400).json(formatValidationError('operating_hours_end', validationMessages.invalidFormat('Closing time')));
  }
  if (operating_hours_start && operating_hours_end && !validators.timeRange(operating_hours_start, operating_hours_end)) {
    return res.status(400).json(formatValidationError('operating_hours', 'Closing time must be after opening time'));
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO facilities (name, address, phone, email, description, operating_hours_start, operating_hours_end)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name, 
      address, 
      phone || null, 
      email || null, 
      description || null,
      operating_hours_start || '09:00',
      operating_hours_end || '21:00'
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: "Facility created successfully"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllFacilities = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        f.*,
        COUNT(CASE WHEN c.is_active = 1 THEN 1 END) as active_courts,
        COUNT(CASE WHEN c.is_active = 0 THEN 1 END) as inactive_courts,
        COUNT(co.id) as total_coaches,
        COUNT(e.id) as total_equipment_types
      FROM facilities f
      LEFT JOIN courts c ON f.id = c.facility_id
      LEFT JOIN coaches co ON f.id = co.facility_id
      LEFT JOIN equipment e ON f.id = e.facility_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
    const facilities = stmt.all();
    res.json(facilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Booking management and overrides
export const overrideBooking = (req, res) => {
  const { id } = req.params;

  const { status, overrideReason } = req.body;
  const adminId = req.userId;
  
  try {
    const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid booking status" });
    }

    const transaction = db.transaction(() => {
      // Update booking status
      const bookingStmt = db.prepare("UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
      const bookingResult = bookingStmt.run(status, id);
      
      if (bookingResult.changes === 0) {
        throw new Error("Booking not found");
      }

      // Create maintenance block to log the override action
      const overrideStmt = db.prepare(`
        INSERT INTO maintenance_blocks (court_id, start_time, end_time, reason, created_by)
        SELECT court_id, start_time, end_time, ?, ?
        FROM bookings WHERE id = ?
      `);
      overrideStmt.run(`Booking override: ${status} - ${overrideReason || 'Admin action'}`, adminId, id);

      return { message: "Booking status updated successfully", newStatus: status };
    });

    const result = transaction();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBookingDetails = (req, res) => {
  const { id } = req.params;
  
  try {
    const stmt = db.prepare(`
      SELECT 
        b.*,
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        c.name as court_name, c.type as court_type,
        f.name as facility_name, f.address as facility_address,
        co.name as coach_name,
        p.payment_method, p.payment_status, p.transaction_id,
        GROUP_CONCAT(e.name || ' (x' || be.quantity || ')', ', ') as equipment_list
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN courts c ON b.court_id = c.id
      JOIN facilities f ON c.facility_id = f.id
      LEFT JOIN coaches co ON b.coach_id = co.id
      LEFT JOIN payments p ON b.payment_id = p.id
      LEFT JOIN bookings_equipment be ON b.id = be.booking_id
      LEFT JOIN equipment e ON be.equipment_id = e.id
      WHERE b.id = ?
      GROUP BY b.id
    `);
    const booking = stmt.get(id);
    
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
