import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { enhancedApi, handleApiError } from "../services/enhancedApi";
import FacilitySelector from "../components/FacilitySelector";
import BookingForm from "../components/BookingForm";
import SlotSelector from "../components/SlotSelector";

const BookingPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('facility');

  // Data states
  const [facilities, setFacilities] = useState([]);
  const [courts, setCourts] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [equipment, setEquipment] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-select facility from URL parameter
  useEffect(() => {
    const facilityId = searchParams.get('facility');
    if (facilityId && facilities.length > 0 && !selectedFacility) {
      const facility = facilities.find(f => f.id === parseInt(facilityId));
      if (facility) {
        handleFacilitySelect(facility);
      }
    }
  }, [searchParams, facilities]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [facilitiesRes, coachesRes, equipmentRes] = await Promise.all([
        enhancedApi.getFacilities(),
        enhancedApi.getCoaches(),
        enhancedApi.getEquipment()
      ]);

      setFacilities(facilitiesRes.data || facilitiesRes);
      setCoaches(coachesRes.data || coachesRes);
      setEquipment(equipmentRes.data || equipmentRes);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFacilitySelect = async (facility) => {
    setSelectedFacility(facility);
    setSelectedCourt(null);
    setSelectedSlot(null);

    try {
      const courtsRes = await enhancedApi.getCourts(facility.id);
      setCourts(courtsRes.data || courtsRes);
      setCurrentStep('court');
    } catch (error) {
      setError(handleApiError(error).message);
    }
  };

  const handleCourtSelect = (court) => {
    setSelectedCourt(court);
    setSelectedSlot(null);
    setCurrentStep('date');
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentStep('slot');
  };

  const handleSlotSelect = (slot) => {
    console.log("BookingPage: handleSlotSelect called", slot);
    setSelectedSlot(slot);
    setCurrentStep('booking');
  };

  const handleBookingComplete = (result) => {
    setBookingData(result);
    setCurrentStep('confirmation');
  };

  const handleBack = () => {
    if (currentStep === 'court') {
      setCurrentStep('facility');
      setSelectedCourt(null);
      setSelectedSlot(null);
    } else if (currentStep === 'date') {
      setCurrentStep('court');
      setSelectedSlot(null);
    } else if (currentStep === 'slot') {
      setCurrentStep('date');
    } else if (currentStep === 'booking') {
      setCurrentStep('slot');
    }
  };

  const resetBooking = () => {
    setCurrentStep('facility');
    setSelectedFacility(null);
    setSelectedCourt(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setBookingData(null);
    setError(null);
  };

  // Helper for step styles
  const getStepStatus = (id, index) => {
    const steps = ['facility', 'court', 'date', 'slot', 'booking', 'confirmation'];
    const currentIndex = steps.indexOf(currentStep);

    if (currentStep === id) return 'active';
    if (currentIndex > index) return 'completed';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          Book Your Experience
        </h1>
        <p className="text-lg text-gray-400">Premium courts for professional athletes</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-12 overflow-x-auto pb-4">
        <div className="flex items-center justify-between min-w-[600px] px-4">
          {[
            { id: 'facility', label: 'Facility', step: 1 },
            { id: 'court', label: 'Court', step: 2 },
            { id: 'date', label: 'Date', step: 3 },
            { id: 'slot', label: 'Time', step: 4 },
            { id: 'booking', label: 'Details', step: 5 },
            { id: 'confirmation', label: 'Finish', step: 6 }
          ].map((item, index) => {
            const status = getStepStatus(item.id, index);
            return (
              <div key={item.id} className="flex items-center flex-1 relative last:flex-none">
                <div className="flex flex-col items-center relative z-10 w-full">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                    ${status === 'active' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-110' :
                      status === 'completed' ? 'bg-green-500 text-white' :
                        'bg-slate-700 text-gray-400'}
                  `}>
                    {status === 'completed' ? '✓' : item.step}
                  </div>
                  <span className={`mt-2 text-xs font-medium uppercase tracking-wider ${status === 'active' ? 'text-blue-400' :
                    status === 'completed' ? 'text-green-400' : 'text-gray-600'
                    }`}>
                    {item.label}
                  </span>
                </div>
                {index < 5 && (
                  <div className="absolute top-5 left-1/2 w-full h-0.5 -z-0">
                    <div className={`h-full transition-all duration-500 ${getStepStatus('ignore', index) === 'completed' ? 'bg-green-500/50' : 'bg-slate-700'
                      }`}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="glass-panel border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 mb-8">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="glass-panel p-8 min-h-[400px]">
        {currentStep === 'facility' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Select a Premium Facility</h2>
            <FacilitySelector
              facilities={facilities}
              selectedFacility={selectedFacility}
              onFacilitySelect={handleFacilitySelect}
            />
          </div>
        )}

        {currentStep === 'court' && selectedFacility && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={handleBack} className="glass-button text-sm text-gray-300">← Back</button>
              <h2 className="text-2xl font-bold text-white">Courts at {selectedFacility.name}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courts.map((court) => (
                <div
                  key={court.id}
                  onClick={() => handleCourtSelect(court)}
                  className={`premium-card cursor-pointer ${selectedCourt?.id === court.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                >
                  <div className="h-32 bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center text-3xl">
                    {court.type === 'Tennis' ? '🎾' : court.type === 'Basketball' ? '🏀' : '⚽'}
                  </div>
                  <h3 className="font-bold text-lg text-white">{court.name}</h3>
                  <div className="flex justify-between mt-4">
                    <span className="text-gray-400 text-sm">{court.type}</span>
                    <span className="text-green-400 font-bold">${court.base_price}/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'date' && selectedCourt && (
          <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
            <button onClick={handleBack} className="glass-button text-sm text-gray-300 mb-4">← Back</button>
            <h2 className="text-2xl font-bold text-white text-center">Select Date</h2>

            <div className="bg-slate-800/50 p-8 rounded-2xl border border-white/10">
              <label className="block text-sm font-medium text-gray-400 mb-3">Booking Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="glass-input text-lg"
              />

              <div className="mt-8 p-4 bg-white/5 rounded-xl flex items-center gap-4">
                <div className="text-3xl">📅</div>
                <div>
                  <div className="text-sm text-gray-400">Selected Court</div>
                  <div className="font-bold text-white">{selectedCourt.name}</div>
                  <div className="text-blue-400 text-sm">${selectedCourt.base_price}/hour</div>
                </div>
              </div>
            </div>

            {selectedDate && (
              <button
                onClick={() => setCurrentStep('slot')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-[1.02]"
              >
                Find Available Slots
              </button>
            )}
          </div>
        )}

        {currentStep === 'slot' && (
          <div className="space-y-6 animate-fadeIn">
            <button onClick={handleBack} className="glass-button text-sm text-gray-300 mb-4">← Back</button>
            <SlotSelector
              court={selectedCourt}
              date={selectedDate}
              onSlotSelect={handleSlotSelect}
            />
          </div>
        )}

        {currentStep === 'booking' && (
          <div className="space-y-6 animate-fadeIn">
            <button onClick={handleBack} className="glass-button text-sm text-gray-300 mb-4">← Back</button>
            <BookingForm court={selectedCourt} slot={selectedSlot} />
          </div>
        )}

        {currentStep === 'confirmation' && bookingData && (
          <div className="text-center py-12 animate-fadeIn">
            <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl">
              ✓
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Booking Confirmed!</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              You're all set. A confirmation email has been sent to your inbox.
            </p>

            <div className="bg-white/5 max-w-md mx-auto rounded-xl p-6 mb-8 text-left border border-white/10">
              <div className="text-sm text-gray-500 mb-1">Booking Reference</div>
              <div className="text-xl font-mono text-white tracking-wider mb-4">{bookingData.bookingReference}</div>
              <div className="flex justify-between border-t border-white/10 pt-4">
                <span className="text-gray-400">Total Paid</span>
                <span className="text-green-400 font-bold text-xl">${bookingData.totalPrice}</span>
              </div>
            </div>

            <button
              onClick={resetBooking}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
            >
              Book Another Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPage;
