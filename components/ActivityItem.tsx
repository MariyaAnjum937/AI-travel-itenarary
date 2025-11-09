
import React from 'react';
import type { Activity } from '../types';
import { MapPinIcon, ClockIcon, InfoIcon } from './icons';

interface ActivityItemProps {
  activity: Activity;
}

const timeBlockStyles: { [key: string]: string } = {
  Morning: 'bg-amber-100 text-amber-800 border-amber-200',
  Afternoon: 'bg-sky-100 text-sky-800 border-sky-200',
  Evening: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const timeStyle = timeBlockStyles[activity.time] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-shrink-0 sm:w-32">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${timeStyle} border`}>
            {activity.time}
          </span>
        </div>
        <div className="flex-grow">
          <h4 className="text-lg font-semibold text-slate-800">{activity.activity}</h4>
          <p className="mt-1 text-slate-600">{activity.description}</p>
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span>{activity.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 flex-shrink-0" />
              <span>{activity.duration}</span>
            </div>
            {activity.notes && (
              <div className="flex items-start gap-2 pt-1">
                <InfoIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span className="italic">{activity.notes}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
