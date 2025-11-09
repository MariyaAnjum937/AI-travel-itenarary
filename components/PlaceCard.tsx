import React from 'react';
import type { SuggestedPlace } from '../types';
import { MapPinIcon } from './icons';

interface PlaceCardProps {
    place: SuggestedPlace;
    onShowDirections: (place: SuggestedPlace) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onShowDirections }) => {
    return (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transform hover:scale-105 transition-transform duration-300">
            {place.image ? (
                <img
                    src={`data:image/png;base64,${place.image}`}
                    alt={place.image_prompt}
                    className="w-full h-48 object-cover"
                />
            ) : (
                <div className="w-full h-48 bg-slate-200 flex items-center justify-center">
                    <span className="text-slate-500">No image available</span>
                </div>
            )}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-800">{place.name}</h3>
                <p className="mt-1 text-sm text-slate-600 h-20 overflow-hidden">{place.description}</p>
                <button
                    onClick={() => onShowDirections(place)}
                    className="mt-4 inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 font-semibold py-2 px-3 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors text-sm"
                >
                    <MapPinIcon className="h-4 w-4" />
                    Get Directions
                </button>
            </div>
        </div>
    );
};