
import React from 'react';
import type { ItineraryDay } from '../types';
import { ItineraryDayCard } from './ItineraryDayCard';

interface ItineraryDisplayProps {
  itinerary: ItineraryDay[];
}

export const ItineraryDisplay: React.FC<ItineraryDisplayProps> = ({ itinerary }) => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-slate-800">Your Personalized Itinerary</h2>
      {itinerary.map((day) => (
        <ItineraryDayCard key={day.day} dayData={day} />
      ))}
    </div>
  );
};
