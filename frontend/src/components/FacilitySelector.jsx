import React from 'react';

const FacilitySelector = ({ facilities, selectedFacility, onFacilitySelect }) => {
  if (facilities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-white/5 rounded-xl border border-white/10">
        <p>No facilities available right now.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {facilities.map((facility) => (
        <div
          key={facility.id}
          onClick={() => onFacilitySelect(facility)}
          className={`premium-card cursor-pointer group relative overflow-hidden ${
            selectedFacility?.id === facility.id 
              ? 'ring-2 ring-blue-500 bg-slate-800/80 shadow-[0_0_30px_rgba(59,130,246,0.2)]' 
              : ''
          }`}
        >
          {/* Decorative background element */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>

          <div className="h-40 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl mb-6 flex items-center justify-center group-hover:from-slate-700 group-hover:to-blue-900/50 transition-all border border-white/5 relative z-10">
            <span className="text-6xl filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
              {facility.name.includes('Tennis') ? '🎾' 
               : facility.name.includes('Swimming') ? '🏊'
               : facility.name.includes('Gym') ? '💪'
               : '🏟️'}
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{facility.name}</h3>
              {facility.status === 'active' && (
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/20">
                  Open
                </span>
              )}
            </div>
            
            <p className="text-gray-400 text-sm mb-4 line-clamp-2 h-10">{facility.description}</p>
            
            <div className="space-y-2 border-t border-white/10 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Courts</span>
                <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded">{facility.total_courts} Available</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Opening Hours</span>
                <span className="text-gray-400">{facility.opening_hours}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Select Facility <span className="ml-2">→</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FacilitySelector;
