import db from "../models/database.js";
import { validators, formatValidationError, validationMessages } from "../utils/validators.js";

// Update existing functions to work with new schema
export const addCourt = (req, res) => {
  const { facility_id, name, type, base_price, indoor = 0, description, max_capacity = 4 } = req.body;
  
  // Validation
  if (!validators.positiveInt(facility_id)) {
    return res.status(400).json(formatValidationError('facility_id', validationMessages.required('Facility ID')));
  }
  if (!validators.nonEmptyString(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.required('Court name')));
  }
  if (!validators.nonEmptyString(type)) {
    return res.status(400).json(formatValidationError('type', validationMessages.required('Court type')));
  }
  if (!validators.price(base_price)) {
    return res.status(400).json(formatValidationError('base_price', validationMessages.positive('Base price')));
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO courts (facility_id, name, type, base_price, indoor, description, max_capacity) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(facility_id, name, type, base_price, indoor, description, max_capacity);
    res.status(201).json({ id: result.lastInsertRowid, name, type, base_price });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const addCoach = (req, res) => {
  const { facility_id, name, price, specialization, phone, email, bio, available = 1 } = req.body;
  
  // Validation
  if (!validators.positiveInt(facility_id)) {
    return res.status(400).json(formatValidationError('facility_id', validationMessages.required('Facility ID')));
  }
  if (!validators.nonEmptyString(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.required('Coach name')));
  }
  if (!validators.price(price)) {
    return res.status(400).json(formatValidationError('price', validationMessages.positive('Price')));
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO coaches (facility_id, name, price, available, specialization, phone, email, bio) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(facility_id, name, price, available, specialization, phone, email, bio);
    res.status(201).json({ id: result.lastInsertRowid, name, price, available });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const addEquipment = (req, res) => {
  const { facility_id, name, type, total_stock, price_per_unit, description } = req.body;
  
  // Validation
  if (!validators.positiveInt(facility_id)) {
    return res.status(400).json(formatValidationError('facility_id', validationMessages.required('Facility ID')));
  }
  if (!validators.nonEmptyString(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.required('Equipment name')));
  }
  if (!validators.positiveInt(total_stock)) {
    return res.status(400).json(formatValidationError('total_stock', validationMessages.positive('Total stock')));
  }
  if (price_per_unit && !validators.price(price_per_unit)) {
    return res.status(400).json(formatValidationError('price_per_unit', validationMessages.positive('Price per unit')));
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO equipment (facility_id, name, type, total_stock, available_stock, price_per_unit, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(facility_id, name, type, total_stock, total_stock, price_per_unit, description);
    res.status(201).json({ id: result.lastInsertRowid, name, type, total_stock, price_per_unit });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const addPricingRule = (req, res) => {
  const { facility_id, name, type, court_type, start_time, end_time, day_of_week, multiplier = 1, surcharge = 0 } = req.body;
  try {
    const stmt = db.prepare(`
      INSERT INTO pricing_rules (facility_id, name, type, court_type, start_time, end_time, day_of_week, multiplier, surcharge) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(facility_id, name, type, court_type, start_time, end_time, day_of_week, multiplier, surcharge);
    res.status(201).json({ id: result.lastInsertRowid, name, type, start_time, end_time, multiplier, surcharge });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
