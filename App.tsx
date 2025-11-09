
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateItinerary } from './services/geminiService';
import type { ItineraryDay } from './types';
import { ItineraryDisplay } from './components/ItineraryDisplay';
import { Chatbot } from './components/Chatbot';
import { Loader } from './components/Loader';
import { ErrorMessage } from './components/ErrorMessage';
import { GlobeIcon, CalendarIcon, SparklesIcon, SendIcon } from './components/icons';
import { Tabs } from './components/Tabs';
import { LiveAssistant } from './components/LiveAssistant';
import { LivePlaces } from './components/LivePlaces';

const App: React.FC = () => {
  const [destination, setDestination] = useState<string>('Paris, France');
  const [duration, setDuration] = useState<string>('3');
  const [interests, setInterests] = useState<string>('Art Museums, Vegan Food, Historical Sites');
  const [itinerary, setItinerary] = useState<ItineraryDay[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('planner');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Some browsers might ignore autoPlay. This ensures it plays.
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error("Video autoplay was prevented by the browser:", err);
          });
        }
      }
    }
  }, [activeTab]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !duration || !interests) {
      setError('Please fill out all fields.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setItinerary(null);

    try {
      const durationNum = parseInt(duration, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        setError('Please enter a valid number of days.');
        setIsLoading(false);
        return;
      }

      const result = await generateItinerary(destination, durationNum, interests);
      setItinerary(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [destination, duration, interests]);
  
  const renderTabContent = () => {
    switch(activeTab) {
      case 'live-places':
        return <LivePlaces />;
      case 'live-assistant':
        return <LiveAssistant />;
      case 'planner':
      default:
        return (
           <>
            <div className="max-w-2xl mx-auto bg-slate-50/90 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8 border border-slate-200/50">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <label htmlFor="destination" className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
                  <div className="absolute inset-y-0 left-0 top-6 pl-3 flex items-center pointer-events-none">
                     <GlobeIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="destination"
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g., Tokyo, Japan"
                    className="w-full bg-white pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                    required
                  />
                </div>

                <div className="relative">
                  <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">Duration (days)</label>
                  <div className="absolute inset-y-0 left-0 top-6 pl-3 flex items-center pointer-events-none">
                     <CalendarIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 5"
                    min="1"
                    className="w-full bg-white pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                    required
                  />
                </div>
                
                <div className="relative">
                  <label htmlFor="interests" className="block text-sm font-medium text-slate-700 mb-1">Interests & Preferences</label>
                   <div className="absolute left-0 top-6 pl-3 flex items-center pointer-events-none">
                     <SparklesIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <textarea
                    id="interests"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g., Art, hiking, vegan food, live music"
                    rows={3}
                    className="w-full bg-white pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {isLoading ? 'Generating...' : 'Create My Itinerary'}
                  {!isLoading && <SendIcon className="h-5 w-5" />}
                </button>
              </form>
            </div>

            <div className="mt-12">
              {isLoading && <Loader />}
              {error && <ErrorMessage message={error} />}
              {itinerary && <ItineraryDisplay itinerary={itinerary} />}
            </div>
           </>
        );
    }
  };

  return (
    <div className="min-h-screen text-slate-900">
      <>
        <div className="fixed inset-0 w-full h-full z-0">
          <video
            ref={videoRef}
            src="https://videos.pexels.com/video-files/853874/853874-hd_1920_1080_25fps.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
      </>

      <main className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight transition-colors duration-300 text-white">
            AI Travel Planner
          </h1>
          <p className="mt-3 text-lg max-w-2xl mx-auto transition-colors duration-300 text-slate-300">
            Your all-in-one assistant to plan, create, and experience your perfect journey.
          </p>
        </header>

        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="mt-8">
            {renderTabContent()}
        </div>

      </main>
      <Chatbot destination={destination} />
    </div>
  );
};

export default App;
