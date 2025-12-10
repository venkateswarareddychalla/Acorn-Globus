# 🏟️ Acorn Globus - Sports Facility Booking Platform

A full-stack web application for managing sports facility court bookings with advanced features including smart suggestions, comprehensive validations, and admin management capabilities.

![Platform Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Admin Credentials](#-admin-credentials)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [User Guide](#-user-guide)
- [Admin Guide](#-admin-guide)
- [Testing](#-testing)
- [Deployment](#-deployment)

---

## ✨ Features

### Core Functionality
- ✅ **User Authentication** - Secure registration and login with JWT tokens
- ✅ **Facility Browsing** - Browse multiple sports facilities with detailed information
- ✅ **Court Booking** - Real-time availability checking and booking
- ✅ **Payment Processing** - Integrated payment confirmation system
- ✅ **Booking Management** - View, manage, and cancel bookings with refund policies
- ✅ **User Profiles** - Manage personal information and booking history

### Advanced Features
- ✅ **Smart Suggestions** - AI-powered alternative slot recommendations when preferred times are unavailable
  - Same court, nearby times (±2 hours)
  - Same facility, different courts
  - Other facilities, same court type
- ✅ **Comprehensive Validations** - Input validation on both frontend and backend
  - Email, phone, password validation
  - Date/time range validation
  - Price and quantity validation
- ✅ **Notification Service** - Automated booking confirmations and alerts
  - Console and file logging
  - Database notification tracking
  - Ready for email/SMS integration (SendGrid/Twilio)

### Admin Features
- ✅ **Facility Management** - Create and manage sports facilities
- ✅ **Court Management** - Add courts, toggle availability, set pricing
- ✅ **Maintenance Scheduling** - Block time slots for maintenance
- ✅ **Booking Oversight** - View, search, and override bookings
- ✅ **Analytics Dashboard** - Revenue, utilization, and performance metrics
- ✅ **Resource Management** - Manage coaches and equipment inventory
- ✅ **User Management** - View users and manage roles

### UI/UX
- ✅ **Glassmorphism Design** - Modern, premium aesthetic with smooth animations
- ✅ **Responsive Layout** - Works seamlessly on desktop and mobile
- ✅ **Real-time Updates** - Instant feedback on booking availability
- ✅ **Interactive Components** - Smooth transitions and micro-animations

---

## 🛠️ Tech Stack

### Frontend
- **React.js** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **React Router** - Client-side routing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database (better-sqlite3)
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Development Tools
- **ESLint** - Code linting
- **Nodemon** - Auto-restart server
- **Git** - Version control

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Acorn-Globus
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the Backend Server** (Port 5000)
```bash
cd backend
npm run server
```

2. **Start the Frontend Dev Server** (Port 5173)
```bash
cd frontend
npm run dev
```

3. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## 🔐 Admin Credentials

### Default Admin Account
- **Email**: `venkateswarareddychalla6@gmail.com`
- **Password**: `Password`

### Admin Access
1. Navigate to http://localhost:5173/login
2. Enter admin credentials
3. Access admin dashboard at http://localhost:5173/admin

---

## 📁 Project Structure

```
Acorn-Globus/
├── backend/
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── enhancedBookingController.js
│   │   ├── adminController.js
│   │   ├── enhancedAdminController.js
│   │   ├── analyticsController.js
│   │   └── suggestionController.js
│   ├── middleware/           # Auth and validation middleware
│   │   └── auth.js
│   ├── models/              # Database models
│   │   └── database.js
│   ├── services/            # Business logic services
│   │   └── notificationService.js
│   ├── utils/               # Utility functions
│   │   └── validators.js
│   ├── server.js            # Express server setup
│   ├── database_new.db      # SQLite database
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── NavBar.jsx
│   │   │   ├── BookingForm.jsx
│   │   │   ├── SlotSelector.jsx
│   │   │   ├── SmartSuggestions.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminMaintenance.jsx
│   │   │   ├── AdminResources.jsx
│   │   │   └── AdminBookings.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── HomePage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── BookingPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── services/        # API services
│   │   │   └── enhancedApi.js
│   │   ├── utils/           # Utility functions
│   │   │   └── validation.js
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Booking Endpoints

#### Get Available Slots
```http
GET /available-slots-enhanced?courtId=1&date=2025-12-10
Authorization: Bearer <token>
```

#### Create Booking
```http
POST /bookings-atomic
Authorization: Bearer <token>
Content-Type: application/json

{
  "courtId": 1,
  "facilityId": 1,
  "startTime": "2025-12-10T10:00:00",
  "endTime": "2025-12-10T11:00:00",
  "playerName": "John Doe",
  "playerPhone": "+1234567890",
  "playerEmail": "john@example.com"
}
```

#### Get User Bookings
```http
GET /bookings/user
Authorization: Bearer <token>
```

#### Cancel Booking
```http
POST /bookings/:id/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Schedule conflict"
}
```

### Smart Suggestions

#### Get Alternative Slots
```http
GET /suggestions/alternative-slots?courtId=1&date=2025-12-10&time=10:00
```

### Admin Endpoints (Require Admin Role)

#### Create Facility
```http
POST /admin/facilities
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Downtown Sports Complex",
  "address": "123 Main St",
  "phone": "+1234567890",
  "email": "info@downtown.com"
}
```

#### Add Court
```http
POST /admin/courts
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "facility_id": 1,
  "name": "Tennis Court 1",
  "type": "Tennis",
  "base_price": 50
}
```

#### Create Maintenance Block
```http
POST /admin/maintenance
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "courtId": 1,
  "startTime": "2025-12-10T08:00:00",
  "endTime": "2025-12-10T12:00:00",
  "reason": "Court resurfacing"
}
```

#### Get Analytics
```http
GET /analytics/dashboard-summary?facilityId=1&startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer <admin-token>
```

---

## 👤 User Guide

### Creating an Account
1. Navigate to http://localhost:5173/login
2. Click "Don't have an account? Sign up"
3. Fill in your name, email, and password
4. Click "Create Account"
5. You'll be automatically logged in

### Booking a Court
1. **Browse Facilities**: From the home page, view available facilities
2. **Select Facility**: Click "Book Now" on your preferred facility
3. **Choose Court**: Select from available courts (Tennis, Basketball, etc.)
4. **Pick Date & Time**: Select your preferred date and time slot
5. **Find Slots**: Click "Find Available Slots"
6. **Select Slot**: Choose from available time slots
7. **Enter Details**: Fill in player name, phone, and email
8. **Confirm & Pay**: Review details and confirm booking
9. **Get Confirmation**: Receive booking reference number

### Managing Bookings
1. Navigate to your profile (click your name in navbar)
2. View all your bookings in "My Bookings" section
3. Cancel bookings if needed (refund policy applies)

### Smart Suggestions
- When your preferred time slot is unavailable, the system automatically suggests alternatives:
  - Nearby times on the same court
  - Same time on different courts
  - Same court type at other facilities
- Click any suggestion to book instantly

---

## 👨‍💼 Admin Guide

### Accessing Admin Dashboard
1. Login with admin credentials
2. Click "Admin Dashboard" in the navigation bar
3. Access four main tabs: Quick Add, Maintenance, Resources, Bookings

### Managing Facilities
1. Go to "Quick Add" tab
2. Fill in facility details (name, address, contact)
3. Click "Add Facility"

### Adding Courts
1. Go to "Quick Add" tab
2. Select facility
3. Enter court details (name, type, price)
4. Click "Add Court"

### Scheduling Maintenance
1. Go to "Maintenance" tab
2. Select court and date range
3. Enter maintenance reason
4. Click "Create Maintenance Block"

### Managing Resources
1. Go to "Resources" tab
2. Toggle court availability
3. Update equipment stock
4. View resource status

### Booking Management
1. Go to "Bookings" tab
2. Search bookings by ID
3. View booking details
4. Override status if needed

### Analytics
- Access comprehensive analytics from the admin dashboard
- View revenue metrics, utilization rates, peak hours
- Filter by date range and facility

---

## 🧪 Testing

### Manual Testing Checklist
- [x] User registration with validation
- [x] User login with validation
- [x] Facility browsing
- [x] Court selection and booking
- [x] Payment confirmation
- [x] Profile booking history
- [x] Admin access control
- [ ] Smart Suggestions (test with fully booked court)
- [ ] Notification service
- [ ] Admin dashboard full functionality

### Running Tests
```bash
# Backend tests (if implemented)
cd backend
npm test

# Frontend tests (if implemented)
cd frontend
npm test
```

---

## 🚢 Deployment

### Environment Variables
Create `.env` files for production:

**Backend `.env`**:
```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=production
DATABASE_PATH=./database_new.db
```

**Frontend `.env`**:
```env
VITE_API_URL=https://your-backend-url.com
```

### Production Build

**Backend**:
```bash
cd backend
npm install --production
node server.js
```

**Frontend**:
```bash
cd frontend
npm run build
# Serve the dist folder with a static server
```

### Deployment Platforms
- **Backend**: Heroku, Railway, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Database**: Consider migrating to PostgreSQL for production

---

## 📝 Database Schema

### Main Tables
- **users** - User accounts with roles (admin/user)
- **facilities** - Sports facilities
- **courts** - Courts within facilities
- **bookings** - Booking records
- **maintenance_blocks** - Maintenance schedules
- **notifications** - Notification log
- **coaches** - Coach information
- **equipment** - Equipment inventory
- **pricing_rules** - Dynamic pricing rules

---

## 🔒 Security Features

- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (prepared statements)
- ✅ XSS prevention
- ✅ Role-based access control
- ✅ Protected admin routes

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Authors

- **Venkateswara Reddy Challa** - Initial work

---

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by leading sports booking platforms
- Designed with user experience as top priority

---

## 📞 Support

For support, email venkateswarareddychalla6@gmail.com or open an issue in the repository.

---

## 🗺️ Roadmap

### Completed ✅
- User authentication and authorization
- Court booking system
- Admin dashboard
- Smart suggestions
- Input validations
- Notification service infrastructure

### Upcoming 🚧
- Email/SMS integration (SendGrid/Twilio)
- Payment gateway integration (Stripe/PayPal)
- Mobile app (React Native)
- Advanced analytics and reporting
- Multi-language support
- Calendar integration
- Loyalty program

---

**Made with ❤️ for sports enthusiasts**
