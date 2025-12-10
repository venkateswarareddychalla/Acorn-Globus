import React, { useState, useEffect } from 'react';
import { enhancedApi, handleApiError, bookingUtils } from '../services/enhancedApi';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dateOfBirth: '',
    emergencyContact: '',
    membershipType: 'standard',
    preferences: {
      email_notifications: true,
      sms_notifications: false,
      marketing_emails: false,
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await enhancedApi.getProfile();
      const { user: userData, profile: profileData } = response.data;

      setUser(userData);
      setProfile(profileData);

      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        dateOfBirth: profileData?.date_of_birth || '',
        emergencyContact: profileData?.emergency_contact || '',
        membershipType: profileData?.membership_type || 'standard',
        preferences: profileData?.preferences ? JSON.parse(profileData.preferences) : {
          email_notifications: true,
          sms_notifications: false,
          marketing_emails: false,
        },
      });
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      const response = await enhancedApi.getUserBookings();
      setBookings(response.data);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadBookings();
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('preferences.')) {
      const prefKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [prefKey]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await enhancedApi.updateProfile(formData);
      await loadProfile();
      setError(null);
      alert('Profile updated successfully!');
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    try {
      const response = await enhancedApi.cancelBookingWithRefund(bookingId, 'User cancellation');
      const { refundAmount, refundPercentage } = response.data;
      alert(`Booking cancelled successfully. Refund: ${bookingUtils.formatPrice(refundAmount)} (${refundPercentage}%)`);
      loadBookings();
    } catch (error) {
      alert(handleApiError(error).message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'completed': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          My Profile
        </h1>
      </div>

      {error && (
        <div className="glass-panel border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 mb-8">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="glass-panel p-2 mb-8 flex space-x-2 overflow-x-auto">
        {[
          { id: 'bookings', label: 'Booking History', icon: '📅' },
          { id: 'stats', label: 'Statistics', icon: '📊' },
          { id: 'profile', label: 'Settings', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-gray-400 hover:text-white hover:bg-white/5'}
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="glass-panel p-6 sm:p-8 min-h-[500px]">

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn max-w-2xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="glass-input w-full"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="glass-input w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="glass-input w-full"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="glass-input w-full"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Emergency Contact</label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  placeholder="Name and phone number"
                  className="glass-input w-full"
                />
              </div>

              <div className="group">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Membership Tier</label>
                <select
                  name="membershipType"
                  value={formData.membershipType}
                  onChange={handleInputChange}
                  className="glass-input w-full bg-slate-800"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(formData.preferences).map(([key, value]) => (
                  <label key={key} className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name={`preferences.${key}`}
                        checked={value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-slate-700'}`}></div>
                      <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : ''}`}></div>
                    </div>
                    <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-105 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="animate-fadeIn space-y-4">
            {bookingsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">You haven't made any bookings yet.</p>
                <button
                  onClick={() => window.location.href = '/booking'}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Book a Court
                </button>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="premium-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{booking.court_name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                    <div className="text-gray-400 space-y-1">
                      <p>
                        📅 {bookingUtils.formatDateTime(booking.start_time).date} | ⏰ {bookingUtils.formatDateTime(booking.start_time).time} - {bookingUtils.formatDateTime(booking.end_time).time}
                      </p>
                      {booking.equipment_list && (
                        <p className="text-sm">🏸 <span className="text-blue-300">Equipment:</span> {booking.equipment_list}</p>
                      )}
                      {booking.coach_name && (
                        <p className="text-sm">👨‍🏫 <span className="text-purple-300">Coach:</span> {booking.coach_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="text-2xl font-bold text-white">{bookingUtils.formatPrice(booking.total_price)}</span>
                    <span className="text-xs text-gray-500 font-mono">#{booking.booking_reference}</span>

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="mt-2 text-xs text-red-400 hover:text-red-300 hover:underline"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
            <div className="premium-card p-6 bg-gradient-to-br from-blue-900/40 to-slate-800">
              <div className="text-blue-400 text-3xl mb-2">📅</div>
              <div className="text-gray-400 text-sm">Total Bookings</div>
              <div className="text-3xl font-bold text-white">{profile.total_bookings || 0}</div>
            </div>

            <div className="premium-card p-6 bg-gradient-to-br from-green-900/40 to-slate-800">
              <div className="text-green-400 text-3xl mb-2">💰</div>
              <div className="text-gray-400 text-sm">Total Spent</div>
              <div className="text-3xl font-bold text-white">{bookingUtils.formatPrice(profile.total_spent || 0)}</div>
            </div>

            <div className="premium-card p-6 bg-gradient-to-br from-purple-900/40 to-slate-800">
              <div className="text-purple-400 text-3xl mb-2">⭐</div>
              <div className="text-gray-400 text-sm">Membership</div>
              <div className="text-3xl font-bold text-white capitalize">{profile.membership_type || 'Standard'}</div>
            </div>

            <div className="premium-card p-6 bg-gradient-to-br from-yellow-900/40 to-slate-800">
              <div className="text-yellow-400 text-3xl mb-2">📊</div>
              <div className="text-gray-400 text-sm">Avg. Booking</div>
              <div className="text-3xl font-bold text-white">
                {bookingUtils.formatPrice(profile.total_bookings > 0 ? (profile.total_spent / profile.total_bookings) : 0)}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserProfile;
