
import axios from 'axios';

const API_BASE = 'https://acorn-globus-dge9.onrender.com';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced API service with all new endpoints
export const enhancedApi = {

  // Authentication
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  
  // User Profile Management
  getProfile: () => api.get('/profile'),
  updateProfile: (profileData) => api.put('/profile', profileData),

  // Facilities and Resources
  getFacilities: () => api.get('/facilities'),
  getCourts: (facilityId) => api.get(`/facilities/${facilityId}/courts`),
  getAllCourts: () => api.get('/courts'),
  getCoaches: () => api.get('/coaches'),
  getEquipment: () => api.get('/equipment'),

  // Enhanced Availability and Booking
  getAvailableSlots: (courtId, date) => api.get('/available-slots', { params: { courtId, date } }),
  getAvailableSlotsEnhanced: (courtId, date) => api.get('/available-slots-enhanced', { params: { courtId, date } }),
  calculatePrice: (pricingData) => api.post('/calculate-price', pricingData),




  // Atomic Booking System
  createBooking: (bookingData) => api.post('/bookings-atomic', bookingData),
  createBookingLegacy: (bookingData) => api.post('/bookings', bookingData), // Legacy
  getUserBookings: () => api.get('/bookings/user'),
  getAllBookings: () => api.get('/bookings/all'),
  cancelBooking: (bookingId) => api.delete(`/bookings/${bookingId}`),
  cancelBookingWithRefund: (bookingId, reason) => api.post(`/bookings/${bookingId}/cancel`, { reason }),

  // Payment Processing
  processPayment: (paymentData) => api.post('/payments/process', paymentData),

  // Admin Management - Maintenance
  adminMaintenance: {
    create: (maintenanceData) => api.post('/admin/maintenance', maintenanceData),
    getAll: (params) => api.get('/admin/maintenance', { params }),
    update: (id, maintenanceData) => api.put(`/admin/maintenance/${id}`, maintenanceData),
    delete: (id) => api.delete(`/admin/maintenance/${id}`),
  },

  // Bulk Operations
  createBulkSlots: (bulkData) => api.post('/admin/bulk-slots', bulkData),

  // Coach Management
  scheduleCoach: (scheduleData) => api.post('/admin/coach-schedule', scheduleData),
  getCoachSchedule: (params) => api.get('/admin/coach-schedule', { params }),

  // Equipment Management
  updateEquipmentStock: (id, stockData) => api.put(`/admin/equipment/${id}/stock`, stockData),
  getEquipmentInventory: (params) => api.get('/admin/equipment-inventory', { params }),

  // User Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),

  // Court and Facility Management
  toggleCourtStatus: (id, isActive) => api.put(`/admin/courts/${id}/status`, { isActive }),
  getAllFacilities: () => api.get('/admin/facilities'),

  // Booking Management
  getBookingDetails: (id) => api.get(`/admin/bookings/${id}`),
  overrideBooking: (id, overrideData) => api.put(`/admin/bookings/${id}/override`, overrideData),


  // Analytics and Reporting
  analytics: {
    dashboardSummary: (params) => api.get('/analytics/dashboard-summary', { params }),
    facilityUtilization: (params) => api.get('/analytics/facility-utilization', { params }),
    courtAnalytics: (params) => api.get('/analytics/court-analytics', { params }),
    timeBased: (params) => api.get('/analytics/time-based', { params }),
    revenue: (params) => api.get('/analytics/revenue', { params }),
    peakHours: (params) => api.get('/analytics/peak-hours', { params }),
    userAnalytics: (params) => api.get('/analytics/user-analytics', { params }),
    equipment: (params) => api.get('/analytics/equipment', { params }),
    coaches: (params) => api.get('/analytics/coaches', { params }),
  },
};


// Utility functions for booking operations
export const bookingUtils = {
  // Format price for display
  formatPrice: (price) => {
    return `$${parseFloat(price).toFixed(2)}`;
  },

  // Generate booking reference for display
  generateBookingRef: () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `BK-${timestamp}-${randomStr}`.toUpperCase();
  },

  // Calculate time until booking for refund eligibility
  getHoursUntilBooking: (bookingTime) => {
    const now = new Date();
    const booking = new Date(bookingTime);
    return (booking - now) / (1000 * 60 * 60);
  },

  // Calculate refund amount based on cancellation policy
  calculateRefund: (originalAmount, hoursUntilBooking) => {
    if (hoursUntilBooking >= 24) {
      return { refundAmount: originalAmount, refundPercentage: 100 };
    } else if (hoursUntilBooking >= 2) {
      return { refundAmount: originalAmount * 0.5, refundPercentage: 50 };
    } else {
      return { refundAmount: 0, refundPercentage: 0 };
    }
  },

  // Format date and time for display
  formatDateTime: (dateTimeString) => {
    const date = new Date(dateTimeString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datetime: date.toLocaleString(),
    };
  },

  // Calculate booking duration
  getBookingDuration: (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  },
};

// Error handling utilities
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data.error || 'An error occurred',
      status: error.response.status,
      details: error.response.data,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error - please check your connection',
      status: 0,
      details: null,
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      details: null,
    };
  }
};

// Notification utilities for booking events
export const notificationUtils = {
  // Format notification messages
  formatBookingMessage: (type, bookingData) => {
    const { booking_reference, court_name, start_time, total_price } = bookingData;
    const formattedTime = bookingUtils.formatDateTime(start_time).datetime;

    switch (type) {
      case 'booking_confirmed':
        return `Your booking ${booking_reference} for ${court_name} on ${formattedTime} has been confirmed. Total: $${total_price}`;
      case 'booking_cancelled':
        return `Your booking ${booking_reference} for ${court_name} has been cancelled.`;
      case 'reminder':
        return `Reminder: Your booking ${booking_reference} for ${court_name} is tomorrow at ${bookingUtils.formatDateTime(start_time).time}`;
      case 'payment_success':
        return `Payment of $${total_price} for booking ${booking_reference} has been processed successfully.`;
      case 'refund_processed':
        return `A refund of $${bookingData.refund_amount} for booking ${booking_reference} has been processed.`;
      default:
        return `Update on your booking ${booking_reference}`;
    }
  },

  // Get notification channel based on user preferences
  getNotificationChannels: (userProfile) => {
    const channels = ['in_app']; // Always include in-app
    if (userProfile?.preferences?.email_notifications) {
      channels.push('email');
    }
    if (userProfile?.preferences?.sms_notifications) {
      channels.push('sms');
    }
    return channels;
  },
};

export default enhancedApi;
