
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../models/database.js";
import { validators, formatValidationError, validationMessages } from "../utils/validators.js";

const JWT_SECRET_KEY = "ACORN_GLOBUS_SECRET_2025";

const generateJWTToken = (id) => jwt.sign({ id }, JWT_SECRET_KEY, { expiresIn: "30d" });

// Register
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  // Validation
  if (!validators.nonEmptyString(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.required('Name')));
  }
  if (!validators.name(name)) {
    return res.status(400).json(formatValidationError('name', validationMessages.minLength('Name', 2)));
  }
  if (!validators.email(email)) {
    return res.status(400).json(formatValidationError('email', validationMessages.invalid('Email')));
  }
  if (!validators.password(password)) {
    return res.status(400).json(formatValidationError('password', validationMessages.minLength('Password', 8)));
  }

  try {
    const userExists = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (userExists)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const insert = db.prepare(`INSERT INTO users(name, email, password) VALUES(?, ?, ?)`);
    const result = insert.run(name, email, hashedPassword);

    const token = generateJWTToken(result.lastInsertRowid);
    res.status(200).json({ success: true, message: "User Registered Successfully", token });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Login
export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!validators.email(email)) {
    return res.status(400).json(formatValidationError('email', validationMessages.invalid('Email')));
  }
  if (!validators.nonEmptyString(password)) {
    return res.status(400).json(formatValidationError('password', validationMessages.required('Password')));
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);

  if (!user)
    return res.status(400).json({ success: false, message: "Invalid User" });

  try {
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ success: false, message: "Invalid Password" });

    const token = generateJWTToken(user.id);
    return res.status(200).json({ success: true, message: "Login Successful", token, role: user.role });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
