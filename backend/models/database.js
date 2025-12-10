import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, "../database_new.db");
const db = new Database(dbPath);


// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date_of_birth DATE,
    emergency_contact TEXT,
    preferences TEXT, -- JSON field for user preferences
    membership_type TEXT DEFAULT 'standard',
    membership_expires_at DATETIME,
    total_bookings INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    description TEXT,
    operating_hours_start TIME DEFAULT '09:00',
    operating_hours_end TIME DEFAULT '21:00',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS courts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    base_price REAL NOT NULL,
    indoor INTEGER DEFAULT 0,
    description TEXT,
    max_capacity INTEGER DEFAULT 4,
    equipment_included TEXT, -- JSON field for included equipment
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (facility_id) REFERENCES facilities (id)
  );


  CREATE TABLE IF NOT EXISTS coaches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    available INTEGER DEFAULT 1,
    specialization TEXT,
    phone TEXT,
    email TEXT,
    bio TEXT,
    rating REAL DEFAULT 0,
    FOREIGN KEY (facility_id) REFERENCES facilities (id)
  );

  CREATE TABLE IF NOT EXISTS coach_unavailability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    reason TEXT,
    FOREIGN KEY (coach_id) REFERENCES coaches (id)
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    total_stock INTEGER NOT NULL,
    available_stock INTEGER NOT NULL,
    price_per_unit REAL NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (facility_id) REFERENCES facilities (id)
  );

  CREATE TABLE IF NOT EXISTS pricing_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    court_type TEXT, -- specific to court type, null for all
    start_time TEXT,
    end_time TEXT,
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    multiplier REAL DEFAULT 1,
    surcharge REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (facility_id) REFERENCES facilities (id)
  );

  CREATE TABLE IF NOT EXISTS maintenance_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER,
    court_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (court_id) REFERENCES courts (id),
    FOREIGN KEY (facility_id) REFERENCES facilities (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_reference TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    facility_id INTEGER NOT NULL,
    court_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    coach_id INTEGER,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
    base_price REAL NOT NULL,
    weekend_surcharge REAL DEFAULT 0,
    peak_multiplier REAL DEFAULT 1,
    equipment_cost REAL DEFAULT 0,
    coach_cost REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded, failed
    payment_id INTEGER,
    cancellation_reason TEXT,
    cancelled_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (facility_id) REFERENCES facilities (id),
    FOREIGN KEY (court_id) REFERENCES courts (id),
    FOREIGN KEY (coach_id) REFERENCES coaches (id),
    FOREIGN KEY (payment_id) REFERENCES payments (id)
  );

  CREATE TABLE IF NOT EXISTS bookings_equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    equipment_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_unit REAL NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings (id),
    FOREIGN KEY (equipment_id) REFERENCES equipment (id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- credit_card, debit_card, wallet, cash
    payment_status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
    transaction_id TEXT UNIQUE,
    payment_gateway TEXT,
    gateway_response TEXT, -- JSON field
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    booking_id INTEGER,
    type TEXT NOT NULL, -- booking_confirmed, booking_cancelled, reminder, payment_success
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    channel TEXT NOT NULL, -- email, sms, push, in_app
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
  );

  CREATE TABLE IF NOT EXISTS booking_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER,
    court_id INTEGER,
    date DATE NOT NULL,
    hour INTEGER NOT NULL,
    bookings_count INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    utilization_rate REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities (id),
    FOREIGN KEY (court_id) REFERENCES courts (id)
  );

  CREATE TABLE IF NOT EXISTS revenue_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id INTEGER,
    date DATE NOT NULL,
    total_revenue REAL DEFAULT 0,
    court_revenue REAL DEFAULT 0,
    coach_revenue REAL DEFAULT 0,
    equipment_revenue REAL DEFAULT 0,
    refunds REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities (id)
  );

  -- Indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON bookings(court_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_booking_reference ON bookings(booking_reference);
  CREATE INDEX IF NOT EXISTS idx_courts_facility_id ON courts(facility_id);
  CREATE INDEX IF NOT EXISTS idx_equipment_facility_id ON equipment(facility_id);
  CREATE INDEX IF NOT EXISTS idx_maintenance_court_id ON maintenance_blocks(court_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
`);


// Seed initial data
const seedData = () => {
  // Check if data already exists
  const facilityCount = db.prepare("SELECT COUNT(*) as count FROM facilities").get().count;
  if (facilityCount > 0) return;

  // Insert facility first
  const insertFacility = db.prepare(`
    INSERT INTO facilities (name, address, phone, email, description) 
    VALUES (?, ?, ?, ?, ?)
  `);
  const facilityResult = insertFacility.run(
    "Sports Complex Downtown",
    "123 Main St, Downtown City",
    "+1-555-0123",
    "info@sportscomplex.com",
    "Premium sports facility with multiple courts and modern amenities"
  );
  const facilityId = facilityResult.lastInsertRowid;

  // Insert courts
  const insertCourt = db.prepare(`
    INSERT INTO courts (facility_id, name, type, base_price, indoor, description, max_capacity, equipment_included)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCourt.run(facilityId, "Tennis Court 1", "Tennis", 50, 1, "Professional tennis court with hard surface", 4, JSON.stringify(["rackets", "tennis_balls"]));
  insertCourt.run(facilityId, "Basketball Court 1", "Basketball", 60, 1, "Indoor basketball court with professional hoops", 10, JSON.stringify(["basketballs", "cones"]));
  insertCourt.run(facilityId, "Soccer Field 1", "Soccer", 80, 0, "Outdoor soccer field with artificial turf", 22, JSON.stringify(["soccer_balls", "goal_nets"]));

  // Insert coaches
  const insertCoach = db.prepare(`
    INSERT INTO coaches (facility_id, name, price, available, specialization, phone, email, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertCoach.run(facilityId, "John Doe", 20, 1, "Tennis", "+1-555-0101", "john@sportscomplex.com", "Professional tennis coach with 10 years experience");
  insertCoach.run(facilityId, "Jane Smith", 25, 1, "Basketball", "+1-555-0102", "jane@sportscomplex.com", "Former college basketball player, specializes in fundamentals");
  insertCoach.run(facilityId, "Mike Johnson", 30, 1, "Soccer", "+1-555-0103", "mike@sportscomplex.com", "Certified soccer coach with youth development expertise");

  // Insert equipment
  const insertEquipment = db.prepare(`
    INSERT INTO equipment (facility_id, name, type, total_stock, available_stock, price_per_unit, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertEquipment.run(facilityId, "Tennis Rackets", "rackets", 20, 20, 5, "Professional tennis rackets available for rent");
  insertEquipment.run(facilityId, "Tennis Balls", "balls", 200, 200, 1, "High-quality tennis balls");
  insertEquipment.run(facilityId, "Basketballs", "balls", 50, 50, 3, "Official size basketballs");
  insertEquipment.run(facilityId, "Soccer Balls", "balls", 30, 30, 4, "FIFA approved soccer balls");
  insertEquipment.run(facilityId, "Cones", "training", 100, 100, 2, "Training cones for drills");

  // Insert pricing rules
  const insertRule = db.prepare(`
    INSERT INTO pricing_rules (facility_id, name, type, court_type, start_time, end_time, day_of_week, multiplier, surcharge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  // Weekend surcharge for all courts
  insertRule.run(facilityId, "Weekend Surcharge", "weekend", null, null, null, 6, 1, 10); // Saturday
  insertRule.run(facilityId, "Weekend Surcharge", "weekend", null, null, null, 0, 1, 10); // Sunday
  
  // Peak hours for tennis
  insertRule.run(facilityId, "Peak Hours Tennis", "peak_hour", "Tennis", "17:00", "21:00", null, 1.2, 0);
  insertRule.run(facilityId, "Peak Hours Basketball", "peak_hour", "Basketball", "18:00", "22:00", null, 1.3, 0);
  
  // Early bird discount
  insertRule.run(facilityId, "Early Bird Discount", "time_based", null, "06:00", "09:00", null, 0.8, 0);

  // Admin user creation removed for production security
  // To create an admin, use the registration flow or manual DB insertion
};

seedData();

export default db;
