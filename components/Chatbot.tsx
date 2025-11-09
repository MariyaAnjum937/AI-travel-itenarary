import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import { getChatbotResponseStream } from '../services/geminiService';
import { ChatBubbleIcon, XMarkIcon, PaperAirplaneIcon } from './icons';
import { ChatMessageItem } from './ChatMessage';

interface ChatbotProps {
    destination: string;
}

export const Chatbot: React.FC<ChatbotProps> = ({ destination }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | undefined>(undefined);

    const messageEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { role: 'model', content: `Hello! How can I help you plan your trip to ${destination}?` }
            ]);
            // Get user's location for grounding
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (err) => {
                    console.warn(`Could not get location: ${err.message}`);
                }
            );
        } else {
            setMessages([]);
            setInput('');
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen, destination]);

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const stream = await getChatbotResponseStream(input, updatedMessages, destination, location);
            
            let modelResponseContent = '';
            let groundingChunks: any[] = [];
            
            setMessages(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of stream) {
                const text = chunk.text;
                modelResponseContent += text;

                if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                  groundingChunks.push(...chunk.candidates[0].groundingMetadata.groundingChunks);
                }
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = modelResponseContent;
                    return newMessages;
                });
            }

            if (groundingChunks.length > 0) {
                const mapSources = groundingChunks
                    .filter(chunk => chunk.maps)
                    .map(chunk => ({ uri: chunk.maps.uri, title: chunk.maps.title }));
                
                const webSources = groundingChunks
                    .filter(chunk => chunk.web)
                    .map(chunk => ({ uri: chunk.web.uri, title: chunk.web.title }));
                
                if (mapSources.length > 0 || webSources.length > 0) {
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].sources = {
                            maps: mapSources.length > 0 ? mapSources : undefined,
                            web: webSources.length > 0 ? webSources : undefined
                        };
                        return newMessages;
                    });
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            setError(errorMessage);
            setMessages(prev => [...prev, { role: 'model', content: `Sorry, I ran into an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform hover:scale-110"
                aria-label="Open travel assistant chat"
            >
                {isOpen ? <XMarkIcon className="h-8 w-8" /> : <ChatBubbleIcon className="h-8 w-8" />}
            </button>

            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200">
                    <header className="p-4 border-b bg-slate-50 rounded-t-2xl">
                        <h3 className="font-semibold text-lg text-slate-800">AI Travel Assistant</h3>
                        <p className="text-sm text-slate-500">Powered by Gemini</p>
                    </header>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <ChatMessageItem key={index} message={msg} />
                        ))}
                         {isLoading && messages[messages.length-1].role === 'user' && (
                            <ChatMessageItem message={{ role: 'model', content: '...' }} />
                        )}
                        <div ref={messageEndRef} />
                    </div>

                    {error && <div className="p-2 text-center text-sm text-red-600 bg-red-50">{error}</div>}

                    <footer className="p-4 border-t bg-white rounded-b-2xl">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                className="w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-indigo-500 focus:border-indigo-500 transition"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-indigo-600 text-white p-3 rounded-full shadow-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
                                aria-label="Send message"
                            >
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                        </form>
                    </footer>
                </div>
            )}
        </>
    );
};