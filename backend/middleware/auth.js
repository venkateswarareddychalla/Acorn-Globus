
import jwt from "jsonwebtoken";

const JWT_SECRET_KEY = "ACORN_GLOBUS_SECRET_2025";

const generateJWTToken = (id) => jwt.sign({ id }, JWT_SECRET_KEY, { expiresIn: "30d" });

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ success: false, message: "Invalid Token" });

  jwt.verify(token, JWT_SECRET_KEY, (error, payload) => {
    if (error)
      return res.status(403).json({ success: false, message: "Invalid Token" });
    req.userId = payload.id;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  // You can add admin check logic here if needed
  next();
};

export { generateJWTToken };
