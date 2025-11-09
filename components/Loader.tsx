import React from 'react';

export const Loader: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-10">
    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    <p className="mt-4 text-slate-300">Generating your perfect trip...</p>
  </div>
);