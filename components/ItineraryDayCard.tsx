import React, { useState } from 'react';
import type { ItineraryDay } from '../types';
import { ActivityItem } from './ActivityItem';
import { ChevronDownIcon, CalendarDaysIcon } from './icons';

interface ItineraryDayCardProps {
  dayData: ItineraryDay;
}

export const ItineraryDayCard: React.FC<ItineraryDayCardProps> = ({ dayData }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-all duration-300">
      {dayData.image && (
        <img 
          src={`data:image/png;base64,${dayData.image}`} 
          alt={dayData.image_prompt || `Scenery for Day ${dayData.day}`}
          className="w-full h-48 object-cover"
        />
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 md:p-5 bg-slate-100/70 hover:bg-slate-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="flex items-center gap-3">
            <CalendarDaysIcon className="h-6 w-6 text-indigo-600" />
            <h3 className="text-xl font-semibold text-slate-800">Day {dayData.day}</h3>
        </div>
        <ChevronDownIcon
          className={`h-6 w-6 text-slate-500 transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="p-4 md:p-6 divide-y divide-slate-200">
          {dayData.schedule.map((activity, index) => (
            <ActivityItem key={index} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
};
