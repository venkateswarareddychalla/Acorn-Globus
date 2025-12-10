import React, { useState, useEffect } from 'react';
import { enhancedApi, handleApiError, bookingUtils } from '../services/enhancedApi';

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Data states
  const [summary, setSummary] = useState(null);
  const [facilityUtilization, setFacilityUtilization] = useState([]);
  const [courtAnalytics, setCourtAnalytics] = useState([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [equipmentAnalytics, setEquipmentAnalytics] = useState([]);
  const [timeBasedAnalytics, setTimeBasedAnalytics] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };

      const [
        summaryResponse,
        utilizationResponse,
        courtResponse,
        revenueResponse,
        peakResponse,
        userResponse,
        equipmentResponse,
        timeResponse,
      ] = await Promise.all([
        enhancedApi.analytics.dashboardSummary(params),
        enhancedApi.analytics.facilityUtilization(params),
        enhancedApi.analytics.courtAnalytics(params),
        enhancedApi.analytics.revenue(params),
        enhancedApi.analytics.peakHours(params),
        enhancedApi.analytics.userAnalytics(params),
        enhancedApi.analytics.equipment(params),
        enhancedApi.analytics.timeBased({ ...params, granularity: 'hour' }),
      ]);

      setSummary(summaryResponse.data);
      setFacilityUtilization(utilizationResponse.data);
      setCourtAnalytics(courtResponse.data);
      setRevenueAnalytics(revenueResponse.data);
      setPeakHours(peakResponse.data);
      setUserAnalytics(userResponse.data);
      setEquipmentAnalytics(equipmentResponse.data);
      setTimeBasedAnalytics(timeResponse.data);
    } catch (error) {
      setError(handleApiError(error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `$${amount?.toFixed(2) || '0.00'}`;
  const formatPercentage = (value) => `${(value || 0).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">Analytics</h1>
          <p className="text-gray-400">Deep insights into facility performance</p>
        </div>

        {/* Date Range Filter */}
        <div className="glass-panel p-2 flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="glass-input py-1.5 px-3 text-sm"
          />
          <span className="text-gray-400 self-center">-</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="glass-input py-1.5 px-3 text-sm"
          />
          <button
            onClick={loadDashboardData}
            className="glass-button bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 text-sm py-1"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 mb-8">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8 overflow-x-auto pb-2">
        <nav className="flex space-x-2">
          {[
            { id: 'summary', label: 'Summary' },
            { id: 'facilities', label: 'Facilities' },
            { id: 'courts', label: 'Courts' },
            { id: 'revenue', label: 'Revenue' },
            { id: 'peak', label: 'Peak Hours' },
            { id: 'users', label: 'Users' },
            { id: 'equipment', label: 'Equipment' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                 ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="animate-fadeIn">
        {/* Dashboard Summary */}
        {activeTab === 'summary' && summary && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="premium-card p-6 bg-gradient-to-br from-blue-900/40 to-slate-800">
                <p className="text-gray-400 text-sm mb-1">Today's Revenue</p>
                <div className="text-3xl font-bold text-white mb-2">{formatCurrency(summary.today?.today_revenue)}</div>
                <div className="text-xs text-blue-300">
                  {summary.today?.today_bookings || 0} Bookings Today
                </div>
              </div>

              <div className="premium-card p-6 bg-gradient-to-br from-purple-900/40 to-slate-800">
                <p className="text-gray-400 text-sm mb-1">Monthly Revenue</p>
                <div className="text-3xl font-bold text-white mb-2">{formatCurrency(summary.month?.month_revenue)}</div>
                <div className="text-xs text-purple-300">
                  {summary.month?.month_bookings || 0} Bookings This Month
                </div>
              </div>

              <div className="premium-card p-6 bg-gradient-to-br from-green-900/40 to-slate-800">
                <p className="text-gray-400 text-sm mb-1">Active Courts</p>
                <div className="text-3xl font-bold text-white mb-2">{summary.today?.courts_in_use || 0}</div>
                <div className="text-xs text-green-300">Currently in use</div>
              </div>

              <div className="premium-card p-6 bg-gradient-to-br from-yellow-900/40 to-slate-800">
                <p className="text-gray-400 text-sm mb-1">Total Users</p>
                <div className="text-3xl font-bold text-white mb-2">{summary.total_users || 0}</div>
                <div className="text-xs text-yellow-300">Registered members</div>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
              <div className="overflow-x-auto">
                {summary.recent_activity?.length === 0 ? (
                  <p className="text-gray-500">No recent activity</p>
                ) : (
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase bg-white/5 text-gray-300">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">Customer</th>
                        <th className="px-4 py-3">Court</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3 text-right rounded-r-lg">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {summary.recent_activity?.map((booking) => (
                        <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 font-medium text-white">{booking.customer_name}</td>
                          <td className="px-4 py-3">{booking.court_name}</td>
                          <td className="px-4 py-3">{bookingUtils.formatDateTime(booking.start_time).datetime}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-400">{formatCurrency(booking.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generic Table Layout for other tabs */}
        {['facilities', 'courts', 'equipment', 'peak'].includes(activeTab) && (
          <div className="glass-panel p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-6 capitalize">{activeTab} Report</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-white/5 text-gray-300">
                  <tr>
                    {activeTab === 'facilities' && <>
                      <th className="px-4 py-3 rounded-l-lg">Facility</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3">Revenue</th>
                      <th className="px-4 py-3 rounded-r-lg">Utilization</th>
                    </>}
                    {activeTab === 'courts' && <>
                      <th className="px-4 py-3 rounded-l-lg">Court</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3 rounded-r-lg">Revenue</th>
                    </>}
                    {activeTab === 'equipment' && <>
                      <th className="px-4 py-3 rounded-l-lg">Item</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">Rented</th>
                      <th className="px-4 py-3 rounded-r-lg">Revenue</th>
                    </>}
                    {activeTab === 'peak' && <>
                      <th className="px-4 py-3 rounded-l-lg">Hour</th>
                      <th className="px-4 py-3">Bookings</th>
                      <th className="px-4 py-3 rounded-r-lg">Revenue</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activeTab === 'facilities' && facilityUtilization.map((f, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{f.facility_name}</td>
                      <td className="px-4 py-3">{f.confirmed_bookings}</td>
                      <td className="px-4 py-3 text-green-400">{formatCurrency(f.total_revenue)}</td>
                      <td className="px-4 py-3">{formatPercentage(f.utilization_rate)}</td>
                    </tr>
                  ))}
                  {activeTab === 'courts' && courtAnalytics.map((c, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{c.court_name}</td>
                      <td className="px-4 py-3">{c.court_type}</td>
                      <td className="px-4 py-3">{c.confirmed_bookings}</td>
                      <td className="px-4 py-3 text-green-400">{formatCurrency(c.total_revenue)}</td>
                    </tr>
                  ))}
                  {activeTab === 'equipment' && equipmentAnalytics.map((e, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{e.equipment_name}</td>
                      <td className="px-4 py-3">{e.total_stock}</td>
                      <td className="px-4 py-3 text-blue-400 font-bold">{e.current_availability}</td>
                      <td className="px-4 py-3">{e.times_rented}</td>
                      <td className="px-4 py-3 text-green-400">{formatCurrency(e.revenue_from_equipment)}</td>
                    </tr>
                  ))}
                  {activeTab === 'peak' && peakHours.map((h, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{h.hour}:00</td>
                      <td className="px-4 py-3">{h.booking_count}</td>
                      <td className="px-4 py-3 text-green-400">{formatCurrency(h.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue Tab Detail */}
        {activeTab === 'revenue' && revenueAnalytics && (
          <div className="glass-panel p-6">
            <h3 className="text-lg font-bold text-white mb-6">Revenue Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-gray-400 text-sm">Court Fees</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(revenueAnalytics.summary?.court_revenue)}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-gray-400 text-sm">Coach Fees</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(revenueAnalytics.summary?.coach_revenue)}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="text-gray-400 text-sm">Equipment Rentals</div>
                <div className="text-2xl font-bold text-white">{formatCurrency(revenueAnalytics.summary?.equipment_revenue)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="text-xs uppercase bg-white/5 text-gray-300">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Date</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3 rounded-r-lg text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {revenueAnalytics.daily_breakdown?.map((day, i) => (
                    <tr key={i} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">{day.date}</td>
                      <td className="px-4 py-3">{day.booking_count}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-bold">{formatCurrency(day.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
