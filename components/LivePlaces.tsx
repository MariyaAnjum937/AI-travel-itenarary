
import React, { useState } from 'react';
import type { SuggestedPlace } from '../types';
import { getLivePlaces } from '../services/geminiService';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { PlaceCard } from './PlaceCard';
import { CompassIcon } from './icons';

export const LivePlaces: React.FC = () => {
    const [places, setPlaces] = useState<SuggestedPlace[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);

    const handleFindPlaces = () => {
        setIsLoading(true);
        setError(null);
        setPlaces(null);
        setUserLocation(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });
                    const result = await getLivePlaces({ latitude, longitude });
                    setPlaces(result);
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                } finally {
                    setIsLoading(false);
                }
            },
            (geoError) => {
                setError(`Could not get location: ${geoError.message}. Please enable location services.`);
                setIsLoading(false);
            },
            { timeout: 10000 }
        );
    };

    const handleShowDirections = (place: SuggestedPlace) => {
        if (!userLocation) {
            // Fallback to the place's map link if user location is not available
            if (place.maps_uri) {
                window.open(place.maps_uri, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const origin = `${userLocation.latitude},${userLocation.longitude}`;
        // Use the place name as the destination. It's usually sufficient for Google Maps.
        const destination = encodeURIComponent(place.name);
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
        
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white">Discover Places Near You</h2>
            <p className="mt-2 text-slate-300 mb-8">Let AI be your local guide. Find interesting spots based on your live location.</p>
            
            <button
                onClick={handleFindPlaces}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
            >
                <CompassIcon className="h-5 w-5" />
                {isLoading ? 'Searching...' : 'Find Places Near Me'}
            </button>

            <div className="mt-10">
                {isLoading && <Loader />}
                {error && <ErrorMessage message={error} />}
                {places && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                        {places.map((place, index) => (
                            <PlaceCard key={index} place={place} onShowDirections={handleShowDirections} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
