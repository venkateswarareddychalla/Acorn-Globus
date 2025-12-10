import { useState, useEffect } from "react";
import { enhancedApi, handleApiError } from "../services/enhancedApi";

const AdminResources = () => {
    const [activeTab, setActiveTab] = useState("courts");
    const [facilities, setFacilities] = useState([]);
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (activeTab === "courts") {
                const res = await enhancedApi.getAllFacilities();
                // Backend returns facilities with courts joined or count. 
                // We might need to fetch courts individually per facility or rely on 'getAllFacilities' 
                // depending on API. Let's assume getAllFacilities gives basic info, 
                // but for management we might want full court list. 
                // Let's use `enhancedApi.getAllCourts()` if it exists? 
                // enhancedApi.js has `getAllCourts: () => api.get('/courts')` which calls `bookingController.getCourts`
                setFacilities(res.data);
            } else {
                const res = await enhancedApi.getEquipment();
                setEquipment(res.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Courts are nested in facilities for display
    // We need a helper to fetch courts for a facility if not fully hydrated
    // Or we can just build a 'ManageCourts' sub-component. 
    // Let's keep it simple: List Facilities, expand to see Courts.

    const FacilitySection = ({ facility }) => {
        const [courts, setCourts] = useState([]);
        const [expanded, setExpanded] = useState(false);

        const toggleExpand = async () => {
            if (!expanded && courts.length === 0) {
                const res = await enhancedApi.getCourts(facility.id);
                setCourts(res.data);
            }
            setExpanded(!expanded);
        };

        const toggleCourtStatus = async (court) => {
            try {
                const newStatus = !court.is_active;
                await enhancedApi.toggleCourtStatus(court.id, newStatus);
                // Optimistic update
                setCourts(courts.map(c => c.id === court.id ? { ...c, is_active: newStatus } : c));
            } catch (error) {
                alert(handleApiError(error).message);
            }
        };

        return (
            <div className="glass-panel p-4 mb-4">
                <div className="flex justify-between items-center cursor-pointer" onClick={toggleExpand}>
                    <div>
                        <h3 className="text-lg font-bold text-white">{facility.name}</h3>
                        <p className="text-sm text-gray-400">{facility.address}</p>
                    </div>
                    <button className="text-blue-300 hover:text-white">
                        {expanded ? "Hide Courts ▲" : "Manage Courts ▼"}
                    </button>
                </div>

                {expanded && (
                    <div className="mt-4 space-y-2 animate-fadeIn">
                        {courts.map(court => (
                            <div key={court.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                                <div>
                                    <div className="text-white font-medium">{court.name}</div>
                                    <div className="text-xs text-gray-400">{court.type} • ${court.base_price}/hr</div>
                                </div>
                                <button
                                    onClick={() => toggleCourtStatus(court)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${court.is_active
                                        ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                        : "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                                        }`}
                                >
                                    {court.is_active ? "Active" : "Inactive"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const EquipmentItem = ({ item }) => {
        const [stock, setStock] = useState(item.total_stock);
        const [editing, setEditing] = useState(false);

        const handleUpdate = async () => {
            try {
                await enhancedApi.updateEquipmentStock(item.id, {
                    totalStock: parseInt(stock),
                    availableStock: parseInt(stock), // Reset available to total (simplified logic)
                    pricePerUnit: item.price_per_unit
                });
                setEditing(false);
                alert("Stock updated");
            } catch (error) {
                alert(handleApiError(error).message);
            }
        };

        return (
            <tr className="hover:bg-white/5">
                <td className="px-4 py-3 text-white">{item.name}</td>
                <td className="px-4 py-3">{item.type}</td>
                <td className="px-4 py-3">
                    {editing ? (
                        <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            className="w-20 glass-input py-1 px-2 text-sm"
                        />
                    ) : item.total_stock}
                </td>
                <td className="px-4 py-3 text-right">
                    {editing ? (
                        <div className="space-x-2">
                            <button onClick={handleUpdate} className="text-green-400">Save</button>
                            <button onClick={() => setEditing(false)} className="text-gray-400">Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => setEditing(true)} className="text-blue-400">Edit Stock</button>
                    )}
                </td>
            </tr>
        );
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex space-x-4 border-b border-white/10 pb-4">
                <button
                    onClick={() => setActiveTab("courts")}
                    className={`text-lg font-bold transition-colors ${activeTab === "courts" ? "text-blue-400" : "text-gray-400"}`}
                >
                    Manage Courts
                </button>
                <button
                    onClick={() => setActiveTab("equipment")}
                    className={`text-lg font-bold transition-colors ${activeTab === "equipment" ? "text-blue-400" : "text-gray-400"}`}
                >
                    Manage Equipment
                </button>
            </div>

            {activeTab === "courts" ? (
                <div className="space-y-4">
                    {facilities.map(f => (
                        <FacilitySection key={f.id} facility={f} />
                    ))}
                </div>
            ) : (
                <div className="glass-panel p-6">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase bg-white/5 text-gray-300">
                            <tr>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Total Stock</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {equipment.map(item => (
                                <EquipmentItem key={item.id} item={item} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminResources;
