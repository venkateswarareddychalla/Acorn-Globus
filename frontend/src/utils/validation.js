// Frontend validation helpers

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

export const validatePhone = (phone) => {
  if (!phone) return true; // Optional
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
};

export const validatePrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0;
};

export const validatePositiveInt = (num) => {
  const parsed = parseInt(num);
  return Number.isInteger(parsed) && parsed > 0;
};

export const validateFutureDate = (date) => {
  if (!date) return false;
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inputDate >= today;
};

export const validateTime = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

// Form error display helper
export const showFieldError = (field, message) => {
  return { field, message, isError: true };
};

export const clearFieldError = () => {
  return { field: null, message: null, isError: false };
};
