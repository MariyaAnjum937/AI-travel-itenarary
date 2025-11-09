import React, { useState, useEffect, useRef } from 'react';
import { generateVideo, checkVideoOperation } from '../services/geminiService';
import { ErrorMessage } from './ErrorMessage';
import { SparklesIcon, VideoIcon, SendIcon } from './icons';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to convert blob to base64"));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const loadingMessages = [
    "Warming up the digital director...",
    "Scouting for the perfect virtual location...",
    "Composing your scene, frame by frame...",
    "Adjusting the lighting and camera angles...",
    "Rendering the final cut...",
    "Adding a touch of cinematic magic...",
    "This is taking longer than usual, but great art takes time!",
];

export const VideoGenerator: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [image, setImage] = useState<{ file: File, url: string } | null>(null);
    const [prompt, setPrompt] = useState<string>('A cinematic, sweeping drone shot of this location at sunrise.');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollInterval = useRef<number | null>(null);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkKey();
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage({ file, url: URL.createObjectURL(file) });
            setVideoUrl(null);
        }
    };

    const pollOperation = (operation: any) => {
        pollInterval.current = window.setInterval(async () => {
            try {
                const updatedOp = await checkVideoOperation(operation);
                if (updatedOp.done) {
                    if (pollInterval.current) clearInterval(pollInterval.current);
                    setIsLoading(false);
                    const uri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                    if (uri) {
                        setVideoUrl(`${uri}&key=${process.env.API_KEY}`);
                    } else {
                        setError('Video generation finished, but no video URL was found.');
                    }
                }
            } catch (err) {
                if (pollInterval.current) clearInterval(pollInterval.current);
                setIsLoading(false);
                setError(err instanceof Error ? err.message : 'Failed to check video status.');
            }
        }, 10000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image || !prompt) {
            setError('Please select an image and enter a prompt.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVideoUrl(null);
        
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        const messageInterval = setInterval(() => {
            messageIndex = (messageIndex + 1);
            if(messageIndex < loadingMessages.length) {
                setLoadingMessage(loadingMessages[messageIndex]);
            } else {
                clearInterval(messageInterval);
            }
        }, 15000);

        try {
            const base64Image = await blobToBase64(image.file);
            const initialOperation = await generateVideo(base64Image, image.file.type, prompt, aspectRatio);
            pollOperation(initialOperation);
        } catch (err) {
            if (err instanceof Error && err.message.includes('Requested entity was not found')) {
                 setApiKeySelected(false);
                 setError("Your API Key is invalid. Please select a valid key.");
            } else {
                setError(err instanceof Error ? err.message : 'Failed to start video generation.');
            }
            setIsLoading(false);
            clearInterval(messageInterval);
        }
    };
    
    if (!apiKeySelected) {
        return (
            <div className="max-w-md mx-auto text-center bg-slate-50 p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
                <p className="mb-6">Video generation requires a valid API key with billing enabled.</p>
                <p className="text-sm text-slate-500 mb-6">
                    For more details, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">billing documentation</a>.
                </p>
                <button onClick={handleSelectKey} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700">
                    Select Your API Key
                </button>
                {error && <div className="mt-4"><ErrorMessage message={error}/></div>}
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="text-center">
                <div className="flex flex-col items-center justify-center p-10">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="mt-6 text-slate-700 text-lg font-semibold">Generating your video...</p>
                    <p className="mt-2 text-slate-500">{loadingMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-800">AI Video Generator</h2>
                <p className="mt-2 text-slate-600">Turn a photo into a captivating video with a simple prompt.</p>
            </div>

            <div className="bg-slate-50 rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload Starting Image</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        {image && <img src={image.url} alt="Preview" className="mt-4 rounded-lg shadow-md max-h-48 mx-auto" />}
                    </div>
                    
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">Video Prompt</label>
                        <textarea
                            id="prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                            className="w-full bg-white pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Aspect Ratio</label>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} className="form-radio text-indigo-600"/>
                                <span>Landscape (16:9)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} className="form-radio text-indigo-600"/>
                                <span>Portrait (9:16)</span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !image}
                        className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        Generate Video
                        <VideoIcon className="h-5 w-5" />
                    </button>
                </form>
            </div>

            {error && <div className="mt-6"><ErrorMessage message={error} /></div>}

            {videoUrl && (
                <div className="mt-8">
                    <h3 className="text-2xl font-bold text-center mb-4">Your Generated Video</h3>
                    <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-lg mx-auto" />
                </div>
            )}
        </div>
    );
};
