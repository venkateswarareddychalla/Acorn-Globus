// Validation utility functions for backend

export const validators = {
  // Email validation
  email: (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  // Phone validation (international format)
  phone: (phone) => {
    if (!phone) return true; // Optional field
    if (typeof phone !== 'string') return false;
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(phone.trim());
  },

  // Password validation (minimum 8 characters)
  password: (pwd) => {
    if (!pwd || typeof pwd !== 'string') return false;
    return pwd.length >= 8;
  },

  // Name validation (2-100 characters)
  name: (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
  },

  // Price validation (non-negative number)
  price: (price) => {
    const num = parseFloat(price);
    return !isNaN(num) && num >= 0;
  },

  // Date validation (valid date format)
  date: (date) => {
    if (!date) return false;
    const timestamp = new Date(date).getTime();
    return !isNaN(timestamp);
  },

  // Future date validation
  futureDate: (date) => {
    if (!validators.date(date)) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
  },

  // Time validation (HH:MM format)
  time: (time) => {
    if (!time || typeof time !== 'string') return false;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  },

  // Positive integer validation
  positiveInt: (num) => {
    const parsed = parseInt(num);
    return Number.isInteger(parsed) && parsed > 0;
  },

  // Non-negative integer validation
  nonNegativeInt: (num) => {
    const parsed = parseInt(num);
    return Number.isInteger(parsed) && parsed >= 0;
  },

  // Non-empty string validation
  nonEmptyString: (str) => {
    return typeof str === 'string' && str.trim().length > 0;
  },

  // Enum validation
  enum: (value, allowedValues) => {
    return allowedValues.includes(value);
  },

  // Array validation
  isArray: (arr) => {
    return Array.isArray(arr);
  },

  // Time range validation (end > start)
  timeRange: (startTime, endTime) => {
    if (!validators.time(startTime) || !validators.time(endTime)) return false;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  }
};

// Validation error formatter
export const formatValidationError = (field, message) => {
  return {
    success: false,
    error: `Validation failed: ${field} - ${message}`,
    field
  };
};

// Common validation messages
export const validationMessages = {
  required: (field) => `${field} is required`,
  invalid: (field) => `${field} is invalid`,
  minLength: (field, min) => `${field} must be at least ${min} characters`,
  maxLength: (field, max) => `${field} must not exceed ${max} characters`,
  positive: (field) => `${field} must be a positive number`,
  futureDate: (field) => `${field} must be a future date`,
  invalidFormat: (field) => `${field} has an invalid format`,
  invalidRange: (field) => `${field} has an invalid range`
};
