import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'
import UserProfile from './components/UserProfile'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import NavBar from './components/NavBar'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [userRole, setUserRole] = useState(() => localStorage.getItem('role') || '')

  const handleLogin = () => {
    setIsLoggedIn(true)
    setUserRole(localStorage.getItem('role') || '')
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setIsLoggedIn(false)
    setUserRole('')
  }

  return (
    <Router>
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <NavBar isLoggedIn={isLoggedIn} userRole={userRole} onLogout={handleLogout} />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />} />

          {/* Home Route - Public */}
          <Route path="/" element={isLoggedIn ? <HomePage /> : <Navigate to="/login" />} />

          {/* Protected User Routes */}
          <Route path="/profile" element={isLoggedIn ? <UserProfile /> : <Navigate to="/login" />} />
          <Route path="/booking" element={isLoggedIn ? <BookingPage /> : <Navigate to="/login" />} />

          {/* Admin Routes */}
          <Route path="/admin" element={isLoggedIn && userRole === 'admin' ? <AdminPage /> : <Navigate to="/login" />} />
          <Route path="/admin/analytics" element={isLoggedIn && userRole === 'admin' ? <AnalyticsDashboard /> : <Navigate to="/login" />} />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
