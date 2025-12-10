import { useState } from "react";
import { enhancedApi, handleApiError, bookingUtils } from "../services/enhancedApi";

const AdminBookings = () => {
    const [searchId, setSearchId] = useState("");
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Override State
    const [overrideStatus, setOverrideStatus] = useState("confirmed");
    const [overrideReason, setOverrideReason] = useState("");

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchId) return;

        try {
            setLoading(true);
            setError(null);
            setBooking(null);
            const res = await enhancedApi.getBookingDetails(searchId);
            setBooking(res.data);
            setOverrideStatus(res.data.status);
        } catch (error) {
            setError("Booking not found");
        } finally {
            setLoading(false);
        }
    };

    const handleOverride = async () => {
        if (!window.confirm("Are you sure you want to force status change? This action is irreversible.")) return;

        try {
            setLoading(true);
            await enhancedApi.overrideBooking(booking.id, {
                status: overrideStatus,
                overrideReason: overrideReason || "Admin manual override"
            });
            alert("Booking status updated successfully");

            // Refresh
            const res = await enhancedApi.getBookingDetails(booking.id);
            setBooking(res.data);
        } catch (error) {
            alert(handleApiError(error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Search Section */}
            <div className="premium-card p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">🔎</span> Find Booking
                </h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Enter Booking ID (Reference ID not yet supported by backend API param, use ID)"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="glass-input flex-1"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-xl font-bold transition-all"
                        disabled={loading}
                    >
                        Search
                    </button>
                </form>
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>

            {booking && (
                <div className="glass-panel p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-white">{booking.court_name}</h3>
                            <p className="text-blue-300 font-mono text-lg">#{booking.booking_reference}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg text-sm font-bold uppercase border ${booking.status === 'confirmed' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                booking.status === 'cancelled' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                            }`}>
                            Current Status: {booking.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-4">
                            <h4 className="text-gray-400 uppercase text-xs font-bold tracking-wider">Customer Details</h4>
                            <div className="p-4 bg-white/5 rounded-lg space-y-2">
                                <p className="text-white"><span className="text-gray-500">Name:</span> {booking.user_name}</p>
                                <p className="text-white"><span className="text-gray-500">Email:</span> {booking.user_email}</p>
                                <p className="text-white"><span className="text-gray-500">Phone:</span> {booking.user_phone}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-gray-400 uppercase text-xs font-bold tracking-wider">Booking Details</h4>
                            <div className="p-4 bg-white/5 rounded-lg space-y-2">
                                <p className="text-white">
                                    <span className="text-gray-500">Time:</span> {bookingUtils.formatDateTime(booking.start_time).datetime}
                                </p>
                                <p className="text-white">
                                    <span className="text-gray-500">Amount:</span> {bookingUtils.formatPrice(booking.total_price)}
                                </p>
                                <p className="text-white">
                                    <span className="text-gray-500">Payment:</span> {booking.payment_status}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin Override Action */}
                    <div className="border-t border-white/10 pt-8">
                        <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                            ⚠️ Admin Override Zone
                        </h4>
                        <div className="flex gap-4 items-end">
                            <div className="flex-1">
                                <label className="text-gray-400 text-xs uppercase mb-1 block">New Status</label>
                                <select
                                    value={overrideStatus}
                                    onChange={(e) => setOverrideStatus(e.target.value)}
                                    className="glass-input w-full bg-slate-800"
                                >
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                    <option value="no_show">No Show</option>
                                </select>
                            </div>
                            <div className="flex-[2]">
                                <label className="text-gray-400 text-xs uppercase mb-1 block">Reason</label>
                                <input
                                    type="text"
                                    placeholder="Reason for visual record"
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    className="glass-input w-full"
                                />
                            </div>
                            <button
                                onClick={handleOverride}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/20"
                            >
                                Apply Override
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBookings;
