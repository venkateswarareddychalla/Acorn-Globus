import db from "../models/database.js";

// Smart suggestion algorithm for alternative slots
export const getAlternativeSlots = async (req, res) => {
  const { courtId, date, startTime, facilityId } = req.query;

  if (!courtId || !date || !startTime) {
    return res.status(400).json({ error: "courtId, date, and startTime are required" });
  }

  try {
    const suggestions = [];

    // Get court details
    const court = db.prepare("SELECT * FROM courts WHERE id = ?").get(courtId);
    if (!court) {
      return res.status(404).json({ error: "Court not found" });
    }

    // 1. Same court, nearby times (±2 hours)
    const nearbyTimes = generateNearbyTimes(startTime, 2);
    for (const time of nearbyTimes) {
      const available = await checkSlotAvailability(courtId, date, time.start, time.end);
      if (available) {
        suggestions.push({
          type: 'same_court_different_time',
          courtId: court.id,
          courtName: court.name,
          courtType: court.type,
          facilityId: court.facility_id,
          date,
          startTime: time.start,
          endTime: time.end,
          price: court.base_price,
          score: 100 - Math.abs(time.diff) * 10,
          label: time.diff < 0 ? `${Math.abs(time.diff)}h earlier` : `${time.diff}h later`
        });
      }
    }

    // 2. Same facility, different courts, same time
    const sameFacilityCourts = db.prepare(`
      SELECT * FROM courts 
      WHERE facility_id = ? AND id != ? AND is_active = 1
    `).all(court.facility_id, courtId);

    for (const altCourt of sameFacilityCourts) {
      const [startHour, startMin] = startTime.split(':');
      const endTime = `${String(parseInt(startHour) + 1).padStart(2, '0')}:${startMin}`;
      const available = await checkSlotAvailability(altCourt.id, date, startTime, endTime);
      if (available) {
        suggestions.push({
          type: 'same_facility_different_court',
          courtId: altCourt.id,
          courtName: altCourt.name,
          courtType: altCourt.type,
          facilityId: altCourt.facility_id,
          date,
          startTime,
          endTime,
          price: altCourt.base_price,
          score: 80,
          label: 'Different court, same time'
        });
      }
    }

    // 3. Other facilities, same court type, same time
    const otherFacilities = db.prepare(`
      SELECT c.*, f.name as facility_name, f.address as facility_address
      FROM courts c
      JOIN facilities f ON c.facility_id = f.id
      WHERE c.type = ? AND c.facility_id != ? AND c.is_active = 1
      LIMIT 5
    `).all(court.type, court.facility_id);

    for (const altCourt of otherFacilities) {
      const [startHour, startMin] = startTime.split(':');
      const endTime = `${String(parseInt(startHour) + 1).padStart(2, '0')}:${startMin}`;
      const available = await checkSlotAvailability(altCourt.id, date, startTime, endTime);
      if (available) {
        suggestions.push({
          type: 'different_facility',
          courtId: altCourt.id,
          courtName: altCourt.name,
          courtType: altCourt.type,
          facilityId: altCourt.facility_id,
          facilityName: altCourt.facility_name,
          facilityAddress: altCourt.facility_address,
          date,
          startTime,
          endTime,
          price: altCourt.base_price,
          score: 60,
          label: 'Nearby facility'
        });
      }
    }

    // Sort by score and return top 5
    const topSuggestions = suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      original: {
        courtId,
        courtName: court.name,
        date,
        startTime
      },
      suggestions: topSuggestions,
      count: topSuggestions.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Helper: Generate nearby time slots
function generateNearbyTimes(startTime, hourRange) {
  const times = [];
  const [hour, min] = startTime.split(':').map(Number);

  for (let diff = -hourRange; diff <= hourRange; diff++) {
    if (diff === 0) continue; // Skip the original time
    
    const newHour = hour + diff;
    if (newHour < 6 || newHour > 22) continue; // Operating hours 6am-10pm
    
    const start = `${String(newHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const end = `${String(newHour + 1).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    
    times.push({ start, end, diff });
  }

  return times;
}

// Helper: Check if a slot is available
async function checkSlotAvailability(courtId, date, startTime, endTime) {
  const startDateTime = `${date} ${startTime}:00`;
  const endDateTime = `${date} ${endTime}:00`;

  // Check for booking conflicts
  const bookingConflict = db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE court_id = ? AND status IN ('confirmed', 'pending')
    AND NOT (end_time <= ? OR start_time >= ?)
  `).get(courtId, startDateTime, endDateTime);

  if (bookingConflict.count > 0) return false;

  // Check for maintenance blocks
  const maintenanceConflict = db.prepare(`
    SELECT COUNT(*) as count FROM maintenance_blocks
    WHERE court_id = ?
    AND NOT (end_time <= ? OR start_time >= ?)
  `).get(courtId, startDateTime, endDateTime);

  if (maintenanceConflict.count > 0) return false;

  return true;
}
