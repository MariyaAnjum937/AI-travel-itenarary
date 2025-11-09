import React from 'react';
import type { ChatMessage } from '../types';
import { UserCircleIcon, AiSparklesIcon, MapPinIcon, SearchIcon } from './icons';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isModel = message.role === 'model';

  return (
    <div className={`flex items-start gap-3 ${isModel ? '' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isModel ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
        {isModel ? <AiSparklesIcon className="h-5 w-5" /> : <UserCircleIcon className="h-6 w-6" />}
      </div>
      <div className="flex-1">
        <div className={`w-fit max-w-full px-4 py-2 rounded-2xl ${isModel ? 'bg-slate-100 text-slate-800 rounded-bl-none' : 'bg-indigo-600 text-white rounded-br-none'}`}>
          <p className="whitespace-pre-wrap">{message.content === '...' ? <span className="animate-pulse">...</span> : message.content}</p>
        </div>
        {(message.sources?.maps || message.sources?.web) && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-slate-500">Sources:</p>
            {message.sources.maps?.map((source, index) => (
              <a
                key={`map-${index}`}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
              >
                <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{source.title}</span>
              </a>
            ))}
            {message.sources.web?.map((source, index) => (
              <a
                key={`web-${index}`}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
              >
                <SearchIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{source.title}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
