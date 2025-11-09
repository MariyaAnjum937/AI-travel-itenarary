
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicIcon } from './icons';
// Fix: Imported the ErrorMessage component to resolve the 'Cannot find name' error.
import { ErrorMessage } from './ErrorMessage';

// Base64 encoding/decoding functions
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


export const LiveAssistant: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
    const [transcription, setTranscription] = useState<{ user: string, model: string }[]>([]);
    const [currentTurn, setCurrentTurn] = useState({ user: '', model: '' });
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);

    const cleanup = useCallback(() => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        sessionPromiseRef.current = null;
    }, []);

    const handleStop = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session:", e);
            }
        }
        cleanup();
        setStatus('idle');
    }, [cleanup]);

    useEffect(() => {
        return () => {
            handleStop();
        };
    }, [handleStop]);
    
    const handleStart = async () => {
        setStatus('connecting');
        setError(null);
        setTranscription([]);
        setCurrentTurn({ user: '', model: '' });
        
        try {
            const API_KEY = process.env.API_KEY;
            if (!API_KEY) throw new Error("API Key not found");
            
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Fix: Cast window to `any` to allow using `webkitAudioContext` for broader browser compatibility, resolving a TypeScript error.
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            // Fix: Cast window to `any` to allow using `webkitAudioContext` for broader browser compatibility, resolving a TypeScript error.
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('connected');
                        const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({...prev, user: prev.user + message.serverContent.inputTranscription.text}));
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({...prev, model: prev.model + message.serverContent.outputTranscription.text}));
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscription(prev => [...prev, currentTurn]);
                            const newCurrentTurn = {user: '', model: ''};
                            setCurrentTurn(newCurrentTurn);
                        }
                        
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outputCtx = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setError('A connection error occurred.');
                        setStatus('error');
                        cleanup();
                    },
                    onclose: () => {
                        cleanup();
                        setStatus('idle');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start session.');
            setStatus('error');
            cleanup();
        }
    };
    
    return (
        <div className="max-w-2xl mx-auto text-center">
             <h2 className="text-3xl font-bold text-white">Live AI Assistant</h2>
             <p className="mt-2 text-slate-300 mb-8">Have a real-time voice conversation with your travel assistant.</p>

             <div className="bg-slate-50 rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
                <button
                    onClick={status === 'connected' ? handleStop : handleStart}
                    disabled={status === 'connecting'}
                    className={`mx-auto flex items-center justify-center h-24 w-24 rounded-full text-white shadow-lg transition-all duration-300
                        ${status === 'connected' ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}
                        ${status === 'connecting' ? 'bg-indigo-400 cursor-not-allowed' : ''}`}
                >
                    <MicIcon className="h-10 w-10"/>
                </button>
                <p className="mt-4 font-semibold capitalize">
                    {status === 'idle' ? 'Tap to start' : status}
                </p>
             </div>
             {error && <div className="mt-4"><ErrorMessage message={error}/></div>}
             <div className="mt-6 text-left bg-white p-4 rounded-lg border h-64 overflow-y-auto">
                {transcription.map((turn, i) => (
                    <div key={i} className="mb-4">
                        <p><strong className="text-slate-600">You:</strong> {turn.user}</p>
                        <p><strong className="text-indigo-600">Assistant:</strong> {turn.model}</p>
                    </div>
                ))}
                 <div className="mb-4">
                    <p><strong className="text-slate-600">You:</strong> {currentTurn.user}<span className="animate-pulse">|</span></p>
                    <p><strong className="text-indigo-600">Assistant:</strong> {currentTurn.model}</p>
                </div>
             </div>
        </div>
    );
};
