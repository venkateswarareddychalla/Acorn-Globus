import db from "../models/database.js";

// Get facility utilization rates
export const getFacilityUtilization = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    // Default to last 30 days if no dates provided
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const utilizationStmt = db.prepare(`
      SELECT 
        f.name as facility_name,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(b.total_price) as total_revenue,
        AVG(b.total_price) as avg_booking_value,
        (COUNT(b.id) * 1.0 / ((julianday(?) - julianday(?)) * 12)) * 100 as utilization_rate
      FROM facilities f
      LEFT JOIN courts c ON f.id = c.facility_id
      LEFT JOIN bookings b ON c.id = b.court_id AND DATE(b.start_time) BETWEEN ? AND ?
      WHERE (? IS NULL OR f.id = ?)
      GROUP BY f.id, f.name
      ORDER BY total_revenue DESC
    `);

    const results = utilizationStmt.all(end, start, start, end, facilityId, facilityId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get court-level analytics
export const getCourtAnalytics = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const courtStatsStmt = db.prepare(`
      SELECT 
        c.id as court_id,
        c.name as court_name,
        c.type as court_type,
        f.name as facility_name,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(b.total_price) as total_revenue,
        AVG(b.total_price) as avg_booking_value,
        SUM(CASE WHEN b.coach_id IS NOT NULL THEN 1 ELSE 0 END) as bookings_with_coach,
        SUM(b.equipment_cost) as equipment_revenue,
        SUM(b.coach_cost) as coach_revenue
      FROM courts c
      JOIN facilities f ON c.facility_id = f.id
      LEFT JOIN bookings b ON c.id = b.court_id AND DATE(b.start_time) BETWEEN ? AND ?
      WHERE (? IS NULL OR f.id = ?)
      GROUP BY c.id, c.name, c.type, f.name
      ORDER BY total_revenue DESC
    `);

    const results = courtStatsStmt.all(start, end, facilityId, facilityId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get time-based analytics (hourly, daily patterns)
export const getTimeBasedAnalytics = (req, res) => {
  const { facilityId, startDate, endDate, granularity = 'hour' } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let timeGroup, dateFormat;
    if (granularity === 'hour') {
      timeGroup = "strftime('%H', b.start_time)";
      dateFormat = "strftime('%Y-%m-%d %H:00', b.start_time)";
    } else {
      timeGroup = "strftime('%w', b.start_time)"; // Day of week
      dateFormat = "DATE(b.start_time)";
    }

    const timeAnalyticsStmt = db.prepare(`
      SELECT 
        ${dateFormat} as time_period,
        ${timeGroup} as time_unit,
        COUNT(b.id) as booking_count,
        SUM(b.total_price) as total_revenue,
        AVG(b.total_price) as avg_revenue,
        COUNT(DISTINCT b.court_id) as courts_used,
        SUM(CASE WHEN b.coach_id IS NOT NULL THEN 1 ELSE 0 END) as coach_bookings
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE DATE(b.start_time) BETWEEN ? AND ?
      AND (? IS NULL OR c.facility_id = ?)
      AND b.status = 'confirmed'
      GROUP BY ${timeGroup}, ${dateFormat}
      ORDER BY time_period
    `);

    const results = timeAnalyticsStmt.all(start, end, facilityId, facilityId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get revenue analytics with breakdowns
export const getRevenueAnalytics = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const revenueStmt = db.prepare(`
      SELECT 
        DATE(b.start_time) as date,
        SUM(b.base_price) as court_revenue,
        SUM(b.coach_cost) as coach_revenue,
        SUM(b.equipment_cost) as equipment_revenue,
        SUM(b.total_price) as total_revenue,
        COUNT(b.id) as booking_count,
        SUM(CASE WHEN b.payment_status = 'refunded' THEN b.total_price ELSE 0 END) as refunds,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as collected_revenue
      FROM bookings b
      JOIN courts c ON b.court_id = c.id
      WHERE DATE(b.start_time) BETWEEN ? AND ?
      AND (? IS NULL OR c.facility_id = ?)
      GROUP BY DATE(b.start_time)
      ORDER BY date DESC
    `);

    const results = revenueStmt.all(start, end, facilityId, facilityId);
    
    // Calculate summary totals
    const summary = results.reduce((acc, day) => ({
      total_revenue: acc.total_revenue + day.total_revenue,
      court_revenue: acc.court_revenue + day.court_revenue,
      coach_revenue: acc.coach_revenue + day.coach_revenue,
      equipment_revenue: acc.equipment_revenue + day.equipment_revenue,
      refunds: acc.refunds + day.refunds,
      collected_revenue: acc.collected_revenue + day.collected_revenue,
      total_bookings: acc.total_bookings + day.booking_count
    }), {
      total_revenue: 0,
      court_revenue: 0,
      coach_revenue: 0,
      equipment_revenue: 0,
      refunds: 0,
      collected_revenue: 0,
      total_bookings: 0
    });

    res.json({
      daily_breakdown: results,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get peak hours and popular time slots
export const getPeakHours = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const peakHoursStmt = db.prepare(`
      SELECT 
        strftime('%H', start_time) as hour,
        COUNT(*) as booking_count,
        SUM(total_price) as revenue,
        AVG(total_price) as avg_price,
        COUNT(DISTINCT court_id) as courts_used,
        SUM(CASE WHEN coach_id IS NOT NULL THEN 1 ELSE 0 END) as coach_bookings
      FROM bookings
      WHERE DATE(start_time) BETWEEN ? AND ?
      AND (? IS NULL OR court_id IN (
        SELECT id FROM courts WHERE facility_id = ?
      ))
      AND status = 'confirmed'
      GROUP BY strftime('%H', start_time)
      ORDER BY booking_count DESC
    `);

    const results = peakHoursStmt.all(start, end, facilityId, facilityId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user analytics (top customers, membership analysis)
export const getUserAnalytics = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Top customers
    const topCustomersStmt = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        up.membership_type,
        COUNT(b.id) as total_bookings,
        SUM(b.total_price) as total_spent,
        AVG(b.total_price) as avg_booking_value,
        MAX(b.start_time) as last_booking
      FROM users u
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN bookings b ON u.id = b.user_id AND DATE(b.start_time) BETWEEN ? AND ?
      WHERE (? IS NULL OR b.court_id IN (
        SELECT id FROM courts WHERE facility_id = ?
      ))
      GROUP BY u.id, u.name, u.email, up.membership_type
      HAVING total_bookings > 0
      ORDER BY total_spent DESC
      LIMIT 20
    `);

    // Membership distribution
    const membershipStatsStmt = db.prepare(`
      SELECT 
        membership_type,
        COUNT(*) as user_count,
        AVG(total_bookings) as avg_bookings,
        AVG(total_spent) as avg_spent
      FROM user_profiles
      GROUP BY membership_type
    `);

    const topCustomers = topCustomersStmt.all(start, end, facilityId, facilityId);
    const membershipStats = membershipStatsStmt.all();

    res.json({
      top_customers: topCustomers,
      membership_distribution: membershipStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get equipment utilization analytics
export const getEquipmentAnalytics = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const equipmentStatsStmt = db.prepare(`
      SELECT 
        e.id,
        e.name as equipment_name,
        e.type,
        e.total_stock,
        e.available_stock,
        e.price_per_unit,
        COUNT(be.id) as times_rented,
        SUM(be.quantity) as total_quantity_rented,
        SUM(be.quantity * be.price_per_unit) as revenue_from_equipment,
        AVG(be.quantity) as avg_quantity_per_booking
      FROM equipment e
      LEFT JOIN bookings_equipment be ON e.id = be.equipment_id
      LEFT JOIN bookings b ON be.booking_id = b.id AND DATE(b.start_time) BETWEEN ? AND ?
      WHERE (? IS NULL OR e.facility_id = ?)
      GROUP BY e.id, e.name, e.type, e.total_stock, e.available_stock, e.price_per_unit
      ORDER BY revenue_from_equipment DESC
    `);

    const results = equipmentStatsStmt.all(start, end, facilityId, facilityId);
    
    // Calculate utilization percentage
    const equipmentWithUtilization = results.map(item => ({
      ...item,
      utilization_rate: item.total_stock > 0 ? (item.total_quantity_rented / item.total_stock) * 100 : 0,
      current_availability: item.available_stock,
      shortage_risk: item.available_stock < (item.total_stock * 0.2) // Less than 20% remaining
    }));

    res.json(equipmentWithUtilization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get coach analytics
export const getCoachAnalytics = (req, res) => {
  const { facilityId, startDate, endDate } = req.query;
  
  try {
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const coachStatsStmt = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.specialization,
        c.price as hourly_rate,
        c.rating,
        COUNT(b.id) as total_sessions,
        SUM(b.coach_cost) as total_revenue,
        AVG(b.coach_cost) as avg_session_value,
        COUNT(DISTINCT DATE(b.start_time)) as active_days,
        AVG(julianday(MAX(b.end_time)) - julianday(MIN(b.start_time))) * 24 as avg_session_hours
      FROM coaches c
      LEFT JOIN bookings b ON c.id = b.coach_id AND DATE(b.start_time) BETWEEN ? AND ?
      WHERE (? IS NULL OR c.facility_id = ?)
      GROUP BY c.id, c.name, c.specialization, c.price, c.rating
      HAVING total_sessions > 0
      ORDER BY total_revenue DESC
    `);

    const results = coachStatsStmt.all(start, end, facilityId, facilityId);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comprehensive dashboard summary
export const getDashboardSummary = (req, res) => {
  const { facilityId } = req.query;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7) + '%';

    // Today's stats
    const todayStmt = db.prepare(`
      SELECT 
        COUNT(*) as today_bookings,
        SUM(total_price) as today_revenue,
        COUNT(DISTINCT court_id) as courts_in_use
      FROM bookings 
      WHERE DATE(start_time) = ? 
      AND (? IS NULL OR court_id IN (SELECT id FROM courts WHERE facility_id = ?))
      AND status = 'confirmed'
    `);

    // This month's stats
    const monthStmt = db.prepare(`
      SELECT 
        COUNT(*) as month_bookings,
        SUM(total_price) as month_revenue,
        AVG(total_price) as avg_booking_value,
        COUNT(DISTINCT user_id) as unique_customers
      FROM bookings 
      WHERE strftime('%Y-%m', start_time) LIKE ?
      AND (? IS NULL OR court_id IN (SELECT id FROM courts WHERE facility_id = ?))
      AND status = 'confirmed'
    `);

    // Upcoming bookings (next 7 days)
    const upcomingStmt = db.prepare(`
      SELECT 
        COUNT(*) as upcoming_bookings,
        SUM(total_price) as upcoming_revenue
      FROM bookings 
      WHERE DATE(start_time) BETWEEN ? AND DATE(?, '+7 day')
      AND (? IS NULL OR court_id IN (SELECT id FROM courts WHERE facility_id = ?))
      AND status = 'confirmed'
    `);

    const todayStats = todayStmt.all(today, facilityId, facilityId);
    const monthStats = monthStmt.all(thisMonth, facilityId, facilityId);
    const upcomingStats = upcomingStmt.all(today, today, facilityId, facilityId);

    // Recent activity (last 10 bookings)
    const recentBookingsStmt = db.prepare(`
      SELECT 
        b.id,
        b.booking_reference,
        u.name as customer_name,
        c.name as court_name,
        b.start_time,
        b.total_price,
        b.status
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN courts c ON b.court_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    const recentBookings = recentBookingsStmt.all();

    res.json({
      today: todayStats[0] || { today_bookings: 0, today_revenue: 0, courts_in_use: 0 },
      month: monthStats[0] || { month_bookings: 0, month_revenue: 0, avg_booking_value: 0, unique_customers: 0 },
      upcoming: upcomingStats[0] || { upcoming_bookings: 0, upcoming_revenue: 0 },
      recent_activity: recentBookings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
