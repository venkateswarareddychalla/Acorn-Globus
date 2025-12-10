import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enhancedApi, handleApiError } from '../services/enhancedApi';

const HomePage = () => {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadFacilities();
    }, []);

    const loadFacilities = async () => {
        try {
            setLoading(true);
            const response = await enhancedApi.getFacilities();
            setFacilities(response.data);
        } catch (error) {
            console.error('Failed to load facilities:', handleApiError(error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleFacilityClick = (facilityId) => {
        navigate(`/booking?facility=${facilityId}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Hero Section */}
            <div className="text-center mb-16">
                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4">
                    Welcome to Acorn Globus
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                    Book premium sports facilities with ease. Choose your facility and start playing today.
                </p>
            </div>

            {/* Facilities Grid */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Our Facilities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {facilities.map((facility) => (
                        <div
                            key={facility.id}
                            onClick={() => handleFacilityClick(facility.id)}
                            className="premium-card p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                                    {facility.name.charAt(0)}
                                </div>
                                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                                    Available
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{facility.name}</h3>

                            <div className="space-y-2 text-sm text-gray-400 mb-4">
                                <div className="flex items-center gap-2">
                                    <span>📍</span>
                                    <span>{facility.address}</span>
                                </div>
                                {facility.phone && (
                                    <div className="flex items-center gap-2">
                                        <span>📞</span>
                                        <span>{facility.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span>⏰</span>
                                    <span>{facility.operating_hours_start} - {facility.operating_hours_end}</span>
                                </div>
                            </div>

                            {facility.description && (
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                    {facility.description}
                                </p>
                            )}

                            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20">
                                Book Now →
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features Section */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="glass-panel p-6 text-center">
                    <div className="text-4xl mb-4">⚡</div>
                    <h3 className="text-lg font-bold text-white mb-2">Instant Booking</h3>
                    <p className="text-gray-400 text-sm">
                        Book your favorite courts in seconds with real-time availability
                    </p>
                </div>
                <div className="glass-panel p-6 text-center">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-lg font-bold text-white mb-2">Premium Facilities</h3>
                    <p className="text-gray-400 text-sm">
                        State-of-the-art courts and equipment for the best experience
                    </p>
                </div>
                <div className="glass-panel p-6 text-center">
                    <div className="text-4xl mb-4">👨‍🏫</div>
                    <h3 className="text-lg font-bold text-white mb-2">Expert Coaches</h3>
                    <p className="text-gray-400 text-sm">
                        Book professional coaches to improve your game
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
