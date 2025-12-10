import { useState } from "react";
import { enhancedApi } from "../services/enhancedApi";
import axios from 'axios';
import AdminMaintenance from "./AdminMaintenance";
import AdminResources from "./AdminResources";
import AdminBookings from "./AdminBookings";

// Helper component for the original "Add" forms
const QuickAddForms = () => {
  const [facilityForm, setFacilityForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    operating_hours_start: "09:00",
    operating_hours_end: "21:00"
  });
  const [courtForm, setCourtForm] = useState({ name: "", type: "", basePrice: "" });
  const [coachForm, setCoachForm] = useState({ name: "", price: "" });
  const [equipmentForm, setEquipmentForm] = useState({ name: "", totalStock: "" });
  const [ruleForm, setRuleForm] = useState({
    name: "",
    type: "",
    startTime: "",
    endTime: "",
    multiplier: "",
    surcharge: "",
  });

  const handleSubmit = async (endpoint, data, setter) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:5000${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      alert("Added successfully!");
      setter({});
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
      {/* Add Facility */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🏢</span> Add Facility
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("/admin/facilities", facilityForm, setFacilityForm);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Facility Name"
            value={facilityForm.name}
            onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
            className="glass-input w-full"
            required
          />
          <input
            type="text"
            placeholder="Address"
            value={facilityForm.address}
            onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
            className="glass-input w-full"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="tel"
              placeholder="Phone"
              value={facilityForm.phone}
              onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })}
              className="glass-input w-full"
            />
            <input
              type="email"
              placeholder="Email"
              value={facilityForm.email}
              onChange={(e) => setFacilityForm({ ...facilityForm, email: e.target.value })}
              className="glass-input w-full"
            />
          </div>
          <textarea
            placeholder="Description"
            value={facilityForm.description}
            onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
            className="glass-input w-full"
            rows="2"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Opening Time</label>
              <input
                type="time"
                value={facilityForm.operating_hours_start}
                onChange={(e) => setFacilityForm({ ...facilityForm, operating_hours_start: e.target.value })}
                className="glass-input w-full"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Closing Time</label>
              <input
                type="time"
                value={facilityForm.operating_hours_end}
                onChange={(e) => setFacilityForm({ ...facilityForm, operating_hours_end: e.target.value })}
                className="glass-input w-full"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20">
            Add Facility
          </button>
        </form>
      </div>

      {/* Add Court */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🏟️</span> Add Court
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("/admin/courts", courtForm, setCourtForm);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Court Name"
            value={courtForm.name}
            onChange={(e) => setCourtForm({ ...courtForm, name: e.target.value })}
            className="glass-input w-full"
            required
          />
          <select
            value={courtForm.type}
            onChange={(e) => setCourtForm({ ...courtForm, type: e.target.value })}
            className="glass-input w-full bg-slate-800"
            required
          >
            <option value="">Select Type</option>
            <option value="indoor">Indoor</option>
            <option value="outdoor">Outdoor</option>
          </select>
          <input
            type="number"
            placeholder="Base Price ($)"
            value={courtForm.basePrice}
            onChange={(e) => setCourtForm({ ...courtForm, basePrice: parseFloat(e.target.value) })}
            className="glass-input w-full"
            required
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20">
            Add Court
          </button>
        </form>
      </div>

      {/* Add Coach */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">👨‍🏫</span> Add Coach
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("/admin/coaches", coachForm, setCoachForm);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Coach Name"
            value={coachForm.name}
            onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })}
            className="glass-input w-full"
            required
          />
          <input
            type="number"
            placeholder="Hourly Rate ($)"
            value={coachForm.price}
            onChange={(e) => setCoachForm({ ...coachForm, price: parseFloat(e.target.value) })}
            className="glass-input w-full"
            required
          />
          <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-green-500/20">
            Add Coach
          </button>
        </form>
      </div>

      {/* Add Equipment */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🏸</span> Add Equipment
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("/admin/equipment", equipmentForm, setEquipmentForm);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Equipment Name"
            value={equipmentForm.name}
            onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
            className="glass-input w-full"
            required
          />
          <input
            type="number"
            placeholder="Total Stock"
            value={equipmentForm.totalStock}
            onChange={(e) => setEquipmentForm({ ...equipmentForm, totalStock: parseInt(e.target.value) })}
            className="glass-input w-full"
            required
          />
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-purple-500/20">
            Add Equipment
          </button>
        </form>
      </div>

      {/* Add Pricing Rule */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">⚡</span> Pricing Rules
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit("/admin/pricing-rules", ruleForm, setRuleForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Rule Name"
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              className="glass-input w-full"
              required
            />
            <select
              value={ruleForm.type}
              onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
              className="glass-input w-full bg-slate-800"
              required
            >
              <option value="">Type</option>
              <option value="weekend">Weekend</option>
              <option value="peak_hour">Peak Hour</option>
            </select>
          </div>

          {ruleForm.type === "peak_hour" && (
            <div className="grid grid-cols-2 gap-4">
              <input
                type="time"
                placeholder="Start Time"
                value={ruleForm.startTime}
                onChange={(e) => setRuleForm({ ...ruleForm, startTime: e.target.value })}
                className="glass-input w-full"
                required
              />
              <input
                type="time"
                placeholder="End Time"
                value={ruleForm.endTime}
                onChange={(e) => setRuleForm({ ...ruleForm, endTime: e.target.value })}
                className="glass-input w-full"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              step="0.01"
              placeholder="Multiplier (x)"
              value={ruleForm.multiplier}
              onChange={(e) => setRuleForm({ ...ruleForm, multiplier: parseFloat(e.target.value) })}
              className="glass-input w-full"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Surcharge ($)"
              value={ruleForm.surcharge}
              onChange={(e) => setRuleForm({ ...ruleForm, surcharge: parseFloat(e.target.value) })}
              className="glass-input w-full"
            />
          </div>

          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-red-500/20">
            Add Rule
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("quick_add");

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Facility Management
          </h1>
          <p className="text-gray-400">Complete control center for admin operations</p>
        </div>
        <a href="/admin/analytics" className="glass-button text-blue-300 border-blue-500/30 hover:bg-blue-500/20">
          View Analytics →
        </a>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-panel p-2 flex flex-wrap gap-2">
        {[
          { id: 'quick_add', label: 'Quick Add', icon: '⚡' },
          { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
          { id: 'resources', label: 'Resources', icon: '📦' },
          { id: 'bookings', label: 'Bookings', icon: '📅' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
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

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'quick_add' && <QuickAddForms />}
        {activeTab === 'maintenance' && <AdminMaintenance />}
        {activeTab === 'resources' && <AdminResources />}
        {activeTab === 'bookings' && <AdminBookings />}
      </div>
    </div>
  );
};

export default AdminDashboard;
