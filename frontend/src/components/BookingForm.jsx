import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enhancedApi, bookingUtils } from '../services/enhancedApi';

const BookingForm = ({ slot, court }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    player_name: '',
    player_email: '',
    player_phone: '',
    special_requests: '',
    equipment_needed: [], // Array of equipment IDs
    coach_id: null
  });

  // Dynamic data states
  const [availableEquipment, setAvailableEquipment] = useState([]);
  const [availableCoaches, setAvailableCoaches] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [loading, setLoading] = useState(false);
  const [showEquipmentOptions, setShowEquipmentOptions] = useState(false);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dynamic data on mount
  useEffect(() => {
    console.log("BookingForm: Mounted. Fetching data...");
    const fetchData = async () => {
      try {
        setLoadingData(true);
        console.log("BookingForm: Calling APIs...");
        const [equipmentRes, coachesRes] = await Promise.all([
          enhancedApi.getEquipment(),
          enhancedApi.getCoaches()
        ]);
        console.log("BookingForm: APIs returned", equipmentRes, coachesRes);
        setAvailableEquipment(equipmentRes.data || equipmentRes);
        setAvailableCoaches(coachesRes.data || coachesRes);
      } catch (err) {
        console.error("Failed to fetch booking options:", err);
        setError("Could not load equipment or coach options. You can still book the court.");
      } finally {
        console.log("BookingForm: Finished loading data");
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Calculate total price breakdown
  const calculateTotalPrice = () => {
    if (!court || !slot) return 0;

    let total = parseFloat(court.base_price) || 0;

    // Add equipment costs
    formData.equipment_needed.forEach(eqId => {
      const item = availableEquipment.find(e => e.id === eqId);
      if (item) {
        total += parseFloat(item.price_per_unit || 0);
      }
    });

    // Add coach fee
    if (formData.coach_id) {
      const coach = availableCoaches.find(c => c.id === parseInt(formData.coach_id));
      if (coach) {
        total += parseFloat(coach.price || 0);
      }
    }

    return total;
  };

  const totalPrice = calculateTotalPrice();
  const basePrice = parseFloat(court?.base_price) || 0;

  const handlePaymentClick = (e) => {
    e.preventDefault();
    setShowConfirmationPopup(true);
  };

  const handleConfirmBooking = async () => {
    setShowConfirmationPopup(false);
    setLoading(true);
    try {
      const equipmentItems = formData.equipment_needed.map(eqId => ({
        equipmentId: eqId,
        quantity: 1
      }));

      const bookingData = {
        courtId: court?.id,
        startTime: slot?.start_time,
        endTime: slot?.end_time,
        equipmentItems: equipmentItems,
        coachId: formData.coach_id ? parseInt(formData.coach_id) : null,
        paymentMethod: 'pending',
        player_name: formData.player_name,
        player_email: formData.player_email,
        player_phone: formData.player_phone,
        special_requests: formData.special_requests
      };

      await enhancedApi.createBooking(bookingData);

      // Trigger success flow in parent
      alert('Booking Successfully Confirmed!');
      navigate('/');

    } catch (error) {
      console.error('Booking error:', error);
      alert('Booking failed: ' + (error.response?.data?.error || error.message || 'Unknown error'));
      setLoading(false);
    }
  };

  const handleEquipmentChange = (equipmentId) => {
    setFormData(prev => ({
      ...prev,
      equipment_needed: prev.equipment_needed.includes(equipmentId)
        ? prev.equipment_needed.filter(id => id !== equipmentId)
        : [...prev.equipment_needed, equipmentId]
    }));
  };

  if (loadingData) {
    return (
      <div className="p-12 text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        Loading booking options...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* LEFT COLUMN: FORM */}
      <div className="lg:col-span-2 space-y-6">
        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl">{error}</div>}

        <form id="booking-form" onSubmit={handlePaymentClick} className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Player Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.player_name}
                    onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                    className="glass-input"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Phone</label>
                  <input
                    type="tel"
                    value={formData.player_phone}
                    onChange={(e) => setFormData({ ...formData, player_phone: e.target.value })}
                    className="glass-input"
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  value={formData.player_email}
                  onChange={(e) => setFormData({ ...formData, player_email: e.target.value })}
                  className="glass-input"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Enhance Your Session</h3>

            {/* Equipment Toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                <input
                  type="checkbox"
                  checked={showEquipmentOptions}
                  onChange={(e) => setShowEquipmentOptions(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-700"
                />
                <span className="font-medium text-gray-200">I need to rent equipment</span>
              </label>

              {showEquipmentOptions && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 animate-fadeIn">
                  {availableEquipment.map((item) => (
                    <label key={item.id} className={`
                        flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                        ${formData.equipment_needed.includes(item.id)
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'bg-white/5 border-white/5 hover:border-white/20'}
                        ${item.available_stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}
                      `}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.equipment_needed.includes(item.id)}
                          onChange={() => handleEquipmentChange(item.id)}
                          disabled={item.available_stock <= 0}
                          className="rounded border-gray-600 text-blue-500 bg-gray-700"
                        />
                        <span className="text-sm text-gray-300">
                          {item.name} {item.available_stock <= 0 && <span className="text-red-400 text-xs">(Out)</span>}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-blue-400">+${item.price_per_unit}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Coach Selection */}
            {availableCoaches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Professional Coach</label>
                <div className="relative">
                  <select
                    value={formData.coach_id || ''}
                    onChange={(e) => setFormData({ ...formData, coach_id: e.target.value || null })}
                    className="glass-input appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-800 text-gray-300">No Coach Required</option>
                    {availableCoaches.map(coach => (
                      <option key={coach.id} value={coach.id} className="bg-slate-800 text-white">
                        {coach.name} ({coach.specialization}) - +${coach.price}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Special Requests</label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              className="glass-input h-24 resize-none"
              placeholder="Need extra water? Net adjustment?"
            />
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: SUMMARY */}
      <div className="lg:col-span-1">
        <div className="glass-panel p-6 sticky top-24">
          <h3 className="text-lg font-semibold text-white mb-6">Booking Summary</h3>

          <div className="space-y-4 mb-6 relative">
            {/* Timeline Graphic */}
            <div className="absolute top-2 bottom-2 left-1.5 w-0.5 bg-gray-700"></div>

            <div className="relative pl-6">
              <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-slate-800"></div>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">Court</p>
              <p className="text-white font-medium">{court?.name || 'Court'}</p>
              <p className="text-sm text-gray-500">{court?.type}</p>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-slate-800"></div>
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Time</p>
              <p className="text-white font-medium">{slot?.date}</p>
              <p className="text-sm text-gray-500">
                {slot?.start_time ? new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} -
                {slot?.end_time ? new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Court Rate</span>
              <span>{bookingUtils.formatPrice(basePrice)}</span>
            </div>

            {formData.equipment_needed.map(eqId => {
              const item = availableEquipment.find(e => e.id === eqId);
              if (!item) return null;
              return (
                <div key={eqId} className="flex justify-between text-sm text-blue-300">
                  <span>+ {item.name}</span>
                  <span>{bookingUtils.formatPrice(item.price_per_unit || 0)}</span>
                </div>
              );
            })}

            {formData.coach_id && (
              <div className="flex justify-between text-sm text-purple-300">
                <span>+ Coach</span>
                <span>
                  {bookingUtils.formatPrice(
                    availableCoaches.find(c => c.id === parseInt(formData.coach_id))?.price || 0
                  )}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end border-t border-white/10 pt-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">{bookingUtils.formatPrice(totalPrice)}</p>
          </div>

          <button
            type="submit"
            form="booking-form"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmationPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-8 max-w-sm w-full animate-fadeIn border-2 border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
            <h3 className="text-xl font-bold text-white mb-2">Ready to Book?</h3>
            <p className="text-gray-400 mb-6 text-sm">
              You are about to book <strong>{court?.name}</strong> for <strong>{bookingUtils.formatPrice(totalPrice)}</strong>.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleConfirmBooking}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Processing...' : 'Yes, Confirm Payment'}
              </button>
              <button
                onClick={() => setShowConfirmationPopup(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
