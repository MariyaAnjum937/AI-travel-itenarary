import React, { useState } from 'react';
import { editImage } from '../services/geminiService';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { SparklesIcon, ImageIcon } from './icons';

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

export const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<{ file: File, url: string } | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('Add a retro, vintage filter');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setEditedImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalImage || !prompt) {
      setError('Please select an image and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const base64Image = await blobToBase64(originalImage.file);
      const result = await editImage(base64Image, originalImage.file.type, prompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800">AI Image Editor</h2>
        <p className="mt-2 text-slate-600">Upload a photo and describe how you want to change it.</p>
      </div>

      <div className="bg-slate-50 rounded-xl shadow-lg p-6 md:p-8 border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="image-upload" className="block text-sm font-medium text-slate-700 mb-1">Upload Image</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">Editing Prompt</label>
            <div className="absolute inset-y-0 left-0 top-6 pl-3 flex items-center pointer-events-none">
              <SparklesIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Make the background black and white"
              className="w-full bg-white pl-10 pr-4 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !originalImage}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? 'Generating...' : 'Apply Edit'}
            {!isLoading && <SparklesIcon className="h-5 w-5" />}
          </button>
        </form>
      </div>

      {isLoading && <Loader />}
      {error && <div className="mt-6"><ErrorMessage message={error} /></div>}
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold text-center mb-2">Original</h3>
          {originalImage && <img src={originalImage.url} alt="Original" className="rounded-lg shadow-md w-full" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-center mb-2">Edited</h3>
          {editedImage && <img src={`data:image/png;base64,${editedImage}`} alt="Edited" className="rounded-lg shadow-md w-full" />}
        </div>
      </div>
    </div>
  );
};
