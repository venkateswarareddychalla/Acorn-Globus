import React, { useState, useEffect } from 'react';
import { enhancedApi, bookingUtils } from '../services/enhancedApi';
import SmartSuggestions from './SmartSuggestions';

const SlotSelector = ({ court, date, onSlotSelect }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (court && date) {
        setLoading(true);
        setError(null);
        setAvailableSlots([]);

        try {
          const formattedDate = date; // Expecting YYYY-MM-DD
          const slotsResponse = await enhancedApi.getAvailableSlots(court.id, formattedDate);

          // Enhanced API returns: { available: true/false, slots: [...] } or just [...]
          let slotsData = slotsResponse.data || slotsResponse;
          if (slotsData.slots) slotsData = slotsData.slots;

          // Transform to ensure we have date objects for display and consistent property names
          const transformedSlots = Array.isArray(slotsData) ? slotsData.map(slot => ({
            ...slot,
            start_time: slot.start || slot.start_time, // Handle both formats
            end_time: slot.end || slot.end_time,
            displayTime: new Date(slot.start || slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            displayEndTime: new Date(slot.end || slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })) : [];

          setAvailableSlots(transformedSlots);
        } catch (error) {
          console.error("Error fetching slots:", error);
          setError("Could not load slots. Please check backend connection.");
          setAvailableSlots([]);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAvailableSlots();
  }, [court, date]);

  const handleSlotClick = (slot) => {
    console.log("SlotSelector: Clicked slot", slot);
    if (slot.available) {
      setSelectedSlotId(slot.id);
      onSlotSelect(slot);
    } else {
      console.log("SlotSelector: Slot unavailable");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">Finding best slots...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-red-500/10 rounded-xl border border-red-500/20">
        <p className="text-red-400 mb-2">⚠️ Connection Error</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <>
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <span className="text-3xl mb-3 block">🗓️</span>
          <p className="text-gray-300 font-medium">No slots available for this date.</p>
          <p className="text-sm text-gray-500 mt-1">Check out our smart suggestions below!</p>
        </div>
        <SmartSuggestions
          courtId={court.id}
          date={date}
          startTime="10:00"
          facilityId={court.facility_id}
        />
      </>
    );
  }

  // Robust date parser helper
  const getHour = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) {
      console.warn("Invalid date string encountered:", dateString);
      return -1;
    }
    return d.getHours();
  };

  // Group slots by Morning/Afternoon/Evening for better UX
  const morningSlots = availableSlots.filter(s => {
    const h = getHour(s.start_time);
    return h >= 0 && h < 12;
  });
  const afternoonSlots = availableSlots.filter(s => {
    const h = getHour(s.start_time);
    return h >= 12 && h < 17;
  });
  const eveningSlots = availableSlots.filter(s => {
    const h = getHour(s.start_time);
    return h >= 17;
  });

  const renderSlotGroup = (title, slots) => {
    if (!slots || slots.length === 0) return null;
    return (
      <div className="mb-6 last:mb-0">
        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3 ml-1">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              onClick={() => handleSlotClick(slot)}
              disabled={!slot.available}
              data-testid="slot-button"
              className={`
                relative p-3 rounded-xl border transition-all duration-200 text-left group
                ${!slot.available
                  ? 'bg-slate-800/50 border-white/5 text-gray-600 cursor-not-allowed decoration-slate-600'
                  : selectedSlotId === slot.id
                    ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-blue-400/50 hover:text-white'
                }
              `}
            >
              <div className="font-bold text-sm mb-1">{slot.displayTime}</div>
              <div className={`text-xs ${selectedSlotId === slot.id ? 'text-blue-200' : 'text-gray-500 group-hover:text-gray-400'}`}>
                {bookingUtils.formatPrice(slot.price || court.base_price)}
              </div>

              {!slot.available && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-xl backdrop-blur-[1px]">
                  <span className="text-[10px] font-bold text-white/50 bg-black/20 px-1.5 py-0.5 rounded">SOLD</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderSlotGroup("Morning", morningSlots)}
      {renderSlotGroup("Afternoon", afternoonSlots)}
      {renderSlotGroup("Evening", eveningSlots)}

      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-white/10 border border-white/10"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-800 border border-white/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20"></div>
            </div>
            <span>Booked</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotSelector;
