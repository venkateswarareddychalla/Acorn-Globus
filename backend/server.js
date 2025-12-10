import express from "express";
import cors from "cors";
import "./models/database.js"; // Initialize DB
import { authenticateToken, requireAdmin } from "./middleware/auth.js";
import { register, login } from "./controllers/authController.js";
import jwt from "jsonwebtoken";

// Original controllers
import { getCourts, getCoaches, getEquipment, createBooking, getAvailableSlots, calculatePrice, getUserBookings, cancelBooking } from "./controllers/bookingController.js";
import { addCourt, addCoach, addEquipment, addPricingRule } from "./controllers/adminController.js";

// Enhanced controllers
import { 
  getFacilities, 
  getCourtsByFacility, 
  getAvailableSlotsEnhanced, 
  createBookingAtomic, 
  processPayment, 
  cancelBookingWithRefund, 
  getUserProfile, 
  updateUserProfile 
} from "./controllers/enhancedBookingController.js";
import { 
  getFacilityUtilization, 
  getCourtAnalytics, 
  getTimeBasedAnalytics, 
  getRevenueAnalytics, 
  getPeakHours, 
  getUserAnalytics, 
  getEquipmentAnalytics, 
  getCoachAnalytics, 
  getDashboardSummary 
} from "./controllers/analyticsController.js";
import { 
  createMaintenanceBlock, 
  getMaintenanceBlocks, 
  updateMaintenanceBlock, 
  deleteMaintenanceBlock, 
  createBulkSlots, 
  scheduleCoach, 
  getCoachSchedule, 
  updateEquipmentStock, 
  getEquipmentInventory, 
  getAllUsers, 
  updateUserRole, 
  toggleCourtStatus, 
  createFacility,
  getAllFacilities, 
  overrideBooking, 
  getBookingDetails 
} from "./controllers/enhancedAdminController.js";
import { getAlternativeSlots } from "./controllers/suggestionController.js";

// Express app
const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get("/", (req, res) => res.send("API is Working"));

// Auth routes
app.post("/auth/register", register);
app.post("/auth/login", login);

// User profile routes
app.get("/profile", authenticateToken, getUserProfile);
app.put("/profile", authenticateToken, updateUserProfile);

// Facilities and courts routes
app.get("/facilities", getFacilities);
app.get("/facilities/:facilityId/courts", getCourtsByFacility);
app.get("/courts", getCourts);
app.get("/coaches", getCoaches);
app.get("/equipment", getEquipment);

// Enhanced availability and booking routes
app.get("/available-slots-enhanced", getAvailableSlotsEnhanced);
app.get("/available-slots", getAvailableSlots); // Keep original for backward compatibility
app.post("/calculate-price", calculatePrice);




// Middleware to handle optional authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    // No token, continue as guest
    return next();
  }

  // Try to verify the token, but don't fail if it's invalid
  try {
    const JWT_SECRET = "ACORN_GLOBUS_SECRET_2025"; // consistent with other files
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        // Token invalid - do NOT continue as guest if they tried to authenticate
        console.log('Optional auth failed (Verify Error):', err.message);
        return res.status(403).json({ error: "Invalid Authentication Token" }); 
      }
      // Token valid, set user
      req.user = user;
      return next();
    });
  } catch (error) {
    // JWT verification failed
    console.log('JWT verification failed (Catch):', error.message);
    return res.status(403).json({ error: "Invalid Authentication Token" });
  }
};

app.post("/bookings-atomic", optionalAuth, async (req, res) => {
  try {
    // Use authenticated user ID if available, otherwise use dummy user ID for guest bookings
    console.log('Booking request user:', req.user);
    const userId = req.user ? req.user.id : 1; // Default user ID for guest bookings
    console.log('Final booking userId:', userId);
    
    const result = await createBookingAtomic({
      ...req.body,
      userId: userId
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post("/bookings", authenticateToken, createBooking); // Keep original for backward compatibility
app.get("/bookings/user", authenticateToken, getUserBookings);
app.delete("/bookings/:id", authenticateToken, cancelBooking);
app.post("/bookings/:id/cancel", authenticateToken, cancelBookingWithRefund);

// Payment processing
app.post("/payments/process", authenticateToken, processPayment);

// Maintenance and admin management routes
app.post("/admin/maintenance", authenticateToken, requireAdmin, createMaintenanceBlock);
app.get("/admin/maintenance", authenticateToken, requireAdmin, getMaintenanceBlocks);
app.put("/admin/maintenance/:id", authenticateToken, requireAdmin, updateMaintenanceBlock);
app.delete("/admin/maintenance/:id", authenticateToken, requireAdmin, deleteMaintenanceBlock);
app.post("/admin/bulk-slots", authenticateToken, requireAdmin, createBulkSlots);

// Coach management
app.post("/admin/coach-schedule", authenticateToken, requireAdmin, scheduleCoach);
app.get("/admin/coach-schedule", authenticateToken, requireAdmin, getCoachSchedule);

// Equipment management
app.put("/admin/equipment/:id/stock", authenticateToken, requireAdmin, updateEquipmentStock);
app.get("/admin/equipment-inventory", authenticateToken, requireAdmin, getEquipmentInventory);

// User management
app.get("/admin/users", authenticateToken, requireAdmin, getAllUsers);
app.put("/admin/users/:id/role", authenticateToken, requireAdmin, updateUserRole);

// Court and facility management
app.put("/admin/courts/:id/status", authenticateToken, requireAdmin, toggleCourtStatus);
app.post("/admin/facilities", authenticateToken, requireAdmin, createFacility);
app.get("/admin/facilities", authenticateToken, requireAdmin, getAllFacilities);

// Booking management and overrides
app.get("/admin/bookings/:id", authenticateToken, requireAdmin, getBookingDetails);
app.put("/admin/bookings/:id/override", authenticateToken, requireAdmin, overrideBooking);

// Analytics routes
app.get("/analytics/facility-utilization", authenticateToken, requireAdmin, getFacilityUtilization);
app.get("/analytics/court-analytics", authenticateToken, requireAdmin, getCourtAnalytics);
app.get("/analytics/time-based", authenticateToken, requireAdmin, getTimeBasedAnalytics);
app.get("/analytics/revenue", authenticateToken, requireAdmin, getRevenueAnalytics);
app.get("/analytics/peak-hours", authenticateToken, requireAdmin, getPeakHours);
app.get("/analytics/user-analytics", authenticateToken, requireAdmin, getUserAnalytics);
app.get("/analytics/equipment", authenticateToken, requireAdmin, getEquipmentAnalytics);
app.get("/analytics/coaches", authenticateToken, requireAdmin, getCoachAnalytics);
app.get("/analytics/dashboard-summary", authenticateToken, requireAdmin, getDashboardSummary);

// Legacy admin routes (keeping for backward compatibility)
app.post("/admin/courts", authenticateToken, requireAdmin, addCourt);
app.post("/admin/coaches", authenticateToken, requireAdmin, addCoach);
app.post("/admin/equipment", authenticateToken, requireAdmin, addEquipment);
app.post("/admin/pricing-rules", authenticateToken, requireAdmin, addPricingRule);

// Smart Suggestions route
app.get("/suggestions/alternative-slots", getAlternativeSlots);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Enhanced server running at http://localhost:${PORT}/`));

export default app;
