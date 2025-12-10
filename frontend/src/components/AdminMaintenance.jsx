import { useState, useEffect } from "react";
import { enhancedApi, handleApiError, bookingUtils } from "../services/enhancedApi";

const AdminMaintenance = () => {
    const [maintenanceBlocks, setMaintenanceBlocks] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        facilityId: "",
        courtId: "",
        startTime: "",
        endTime: "",
        reason: "",
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [facilitiesRes, maintenanceRes] = await Promise.all([
                enhancedApi.getAllFacilities(),
                enhancedApi.adminMaintenance.getAll({})
            ]);
            setFacilities(facilitiesRes.data);
            setMaintenanceBlocks(maintenanceRes.data);
        } catch (error) {
            setError(handleApiError(error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleFacilityChange = async (e) => {
        const facilityId = e.target.value;
        setFormData({ ...formData, facilityId, courtId: "" });
        if (facilityId) {
            try {
                const res = await enhancedApi.getCourts(facilityId);
                setCourts(res.data);
            } catch (error) {
                console.error("Failed to load courts", error);
            }
        } else {
            setCourts([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await enhancedApi.adminMaintenance.create(formData);
            alert("Maintenance block created successfully");

            // Refresh list and reset form
            const res = await enhancedApi.adminMaintenance.getAll({});
            setMaintenanceBlocks(res.data);
            setFormData({
                facilityId: "",
                courtId: "",
                startTime: "",
                endTime: "",
                reason: "",
            });
        } catch (error) {
            alert(handleApiError(error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this maintenance block?")) return;
        try {
            await enhancedApi.adminMaintenance.delete(id);
            const res = await enhancedApi.adminMaintenance.getAll({});
            setMaintenanceBlocks(res.data);
        } catch (error) {
            alert(handleApiError(error).message);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Create Block Form */}
            <div className="premium-card p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">🔧</span> Schedule Maintenance
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={formData.facilityId}
                            onChange={handleFacilityChange}
                            className="glass-input w-full bg-slate-800"
                            required
                        >
                            <option value="">Select Facility</option>
                            {facilities.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>

                        <select
                            value={formData.courtId}
                            onChange={(e) => setFormData({ ...formData, courtId: e.target.value })}
                            className="glass-input w-full bg-slate-800"
                            required
                            disabled={!formData.facilityId}
                        >
                            <option value="">Select Court</option>
                            {courts.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="group">
                            <label className="text-gray-400 text-xs uppercase ml-1">Start Time</label>
                            <input
                                type="datetime-local"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="glass-input w-full"
                                required
                            />
                        </div>
                        <div className="group">
                            <label className="text-gray-400 text-xs uppercase ml-1">End Time</label>
                            <input
                                type="datetime-local"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="glass-input w-full"
                                required
                            />
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Reason for maintenance"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="glass-input w-full"
                        required
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50"
                    >
                        {loading ? "Scheduling..." : "Create Maintenance Block"}
                    </button>
                </form>
            </div>

            {/* Maintenance List */}
            <div className="glass-panel p-6">
                <h3 className="text-lg font-bold text-white mb-6">Active Maintenance Blocks</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-white/5 text-gray-300">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Facility / Court</th>
                                <th className="px-4 py-3">Duration</th>
                                <th className="px-4 py-3">Reason</th>
                                <th className="px-4 py-3 rounded-r-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {maintenanceBlocks.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center">No maintenance scheduled</td>
                                </tr>
                            ) : (
                                maintenanceBlocks.map((block) => (
                                    <tr key={block.id} className="hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <div className="text-white font-medium">{block.facility_name}</div>
                                            <div className="text-xs text-blue-300">{block.court_name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{bookingUtils.formatDateTime(block.start_time).datetime}</div>
                                            <div className="text-xs text-gray-500">to {bookingUtils.formatDateTime(block.end_time).datetime}</div>
                                        </td>
                                        <td className="px-4 py-3">{block.reason}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(block.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminMaintenance;
