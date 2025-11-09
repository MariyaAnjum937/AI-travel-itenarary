import React from 'react';
import { CalendarDaysIcon, MicIcon, CompassIcon } from './icons';

interface TabsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const tabs = [
    { id: 'planner', name: 'Itinerary Planner', icon: CalendarDaysIcon },
    { id: 'live-places', name: 'Live Places', icon: CompassIcon },
    { id: 'live-assistant', name: 'Live Assistant', icon: MicIcon },
];

export const Tabs: React.FC<TabsProps> = ({ activeTab, setActiveTab }) => {
    return (
        <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-6 justify-center" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                            activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <tab.icon className="h-5 w-5" />
                        {tab.name}
                    </button>
                ))}
            </nav>
        </div>
    );
};