import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SmartSuggestions = ({ courtId, date, startTime, facilityId }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (courtId && date && startTime) {
            loadSuggestions();
        }
    }, [courtId, date, startTime]);

    const loadSuggestions = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/suggestions/alternative-slots', {
                params: { courtId, date, startTime, facilityId }
            });
            setSuggestions(response.data.suggestions || []);
        } catch (error) {
            console.error('Failed to load suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const applySuggestion = (suggestion) => {
        // Navigate to booking with pre-filled data
        navigate(`/booking?facility=${suggestion.facilityId}&court=${suggestion.courtId}&date=${suggestion.date}&time=${suggestion.startTime}`);
        window.location.reload(); // Reload to apply new parameters
    };

    if (loading) {
        return (
            <div className="glass-panel p-6 mt-6">
                <div className="animate-pulse">Loading alternatives...</div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="glass-panel p-6 mt-6 border-yellow-500/30 bg-yellow-500/10">
                <div className="text-yellow-200">
                    <h3 className="font-bold mb-2">⚠️ No Slots Available</h3>
                    <p className="text-sm">Unfortunately, there are no alternative slots available at this time. Please try a different date or contact us for assistance.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6 mt-6 animate-fadeIn">
            <h3 className="text-xl font-bold text-white mb-4">💡 Smart Suggestions</h3>
            <p className="text-gray-400 mb-6 text-sm">
                Your preferred slot is unavailable. Here are some alternatives:
            </p>

            <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                    <div
                        key={index}
                        className="premium-card p-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20"
                        onClick={() => applySuggestion(suggestion)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                                        {suggestion.label}
                                    </span>
                                    {suggestion.type === 'different_facility' && (
                                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                            {suggestion.facilityName}
                                        </span>
                                    )}
                                </div>

                                <div className="text-white font-bold">{suggestion.courtName}</div>
                                <div className="text-sm text-gray-400">
                                    {suggestion.courtType} • {new Date(`${suggestion.date} ${suggestion.startTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {suggestion.type === 'different_facility' && (
                                        <> • {suggestion.facilityAddress}</>
                                    )}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-2xl font-bold text-green-400">${suggestion.price}</div>
                                <button className="mt-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all">
                                    Book This →
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-lg text-center">
                <p className="text-gray-400 text-sm">
                    Can't find what you're looking for? <a href="/contact" className="text-blue-400 hover:underline">Contact us</a> for personalized assistance.
                </p>
            </div>
        </div>
    );
};

export default SmartSuggestions;
