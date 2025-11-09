
import { GoogleGenAI, Type, Content, Modality } from '@google/genai';
import type { ItineraryDay, ChatMessage, SuggestedPlace } from '../types';

let ai: GoogleGenAI;

const getAI = () => {
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    }
    return ai;
}


const itinerarySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: {
        type: Type.NUMBER,
        description: 'The day number of the itinerary, starting from 1.'
      },
      image_prompt: {
        type: Type.STRING,
        description: 'A creative, descriptive prompt for generating a cover image for this day. E.g., "A vibrant street market in Marrakech with colorful spices".'
      },
      schedule: {
        type: Type.ARRAY,
        description: 'A list of activities scheduled for the day.',
        items: {
          type: Type.OBJECT,
          properties: {
            time: {
              type: Type.STRING,
              description: 'The time block for the activity (e.g., "Morning", "Afternoon", "Evening").'
            },
            activity: {
              type: Type.STRING,
              description: 'The name of the activity.'
            },
            location: {
              type: Type.STRING,
              description: 'The location or address of the activity.'
            },
            duration: {
              type: Type.STRING,
              description: 'The estimated duration of the activity (e.g., "2 hours").'
            },
            description: {
              type: Type.STRING,
              description: 'A brief description of the activity.'
            },
            notes: {
              type: Type.STRING,
              description: 'Optional practical notes or tips for the activity.'
            }
          },
          required: ['time', 'activity', 'location', 'duration', 'description'],
        }
      }
    },
    required: ['day', 'schedule', 'image_prompt'],
  }
};

const createPrompt = (destination: string, duration: number, interests: string): string => {
  return `
    You are a world-class travel planning assistant. Your task is to create a detailed, multi-day travel itinerary based on user inputs.

    **User Inputs:**
    - Destination: ${destination}
    - Duration: ${duration} days
    - Interests: ${interests}

    **Your Requirements:**
    1.  **Structure:** Create a day-by-day schedule for the entire ${duration}-day duration.
    2.  **Cover Image Prompt**: For each day, create a short but descriptive prompt to generate a beautiful, representative cover image for the day's theme.
    3.  **Time Blocks:** Break each day into "Morning", "Afternoon", and "Evening" sections.
    4.  **Activity Details:** For each activity, provide all the required fields.
    5.  **Logistics:** Group activities geographically to minimize travel time. Suggest logical flows from one place to the next.
    6.  **Realism:** Ensure the schedule is practical and not overly packed. Include time for travel, meals, and rest.
    7.  **Catering to Interests:** The itinerary must strongly reflect the user's stated interests: "${interests}".
    8.  **JSON Output:** The final output MUST be a valid JSON object that strictly adheres to the provided schema. Do not include any text, explanations, or markdown formatting outside of the JSON structure.
  `;
};

const generateImageForDay = async (prompt: string): Promise<string | undefined> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const part = response.candidates?.[0]?.content.parts[0];
        if (part?.inlineData) {
            return part.inlineData.data;
        }
    } catch (error) {
        console.error(`Failed to generate image for prompt "${prompt}":`, error);
    }
    return undefined;
};

export const generateItinerary = async (destination: string, duration: number, interests: string): Promise<ItineraryDay[]> => {
  const prompt = createPrompt(destination, duration, interests);
  const ai = getAI();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: itinerarySchema,
      },
    });

    let jsonText = response.text.trim();
    
    const startIndex = jsonText.indexOf('[');
    const endIndex = jsonText.lastIndexOf(']');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      jsonText = jsonText.substring(startIndex, endIndex + 1);
    } else {
      throw new Error("Could not find a valid JSON array in the AI's response.");
    }
    
    let parsedItinerary: ItineraryDay[] = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedItinerary)) {
        throw new Error("Invalid itinerary format received from API. Expected an array.");
    }
    
    const imagePromises = parsedItinerary.map(day => 
        day.image_prompt ? generateImageForDay(day.image_prompt) : Promise.resolve(undefined)
    );
    const images = await Promise.all(imagePromises);

    parsedItinerary.forEach((day, index) => {
        day.image = images[index];
    });

    return parsedItinerary;

  } catch (error) {
    console.error("Error generating itinerary:", error);
    throw new Error("Failed to generate itinerary. The AI's response might be malformed. Please try again.");
  }
};

const buildHistory = (messages: ChatMessage[]): Content[] => {
    return messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));
};

export const getChatbotResponseStream = async (
  message: string,
  history: ChatMessage[],
  destination: string,
  location?: { latitude: number, longitude: number }
) => {
    const ai = getAI();
    const systemInstruction = `You are a helpful and friendly travel assistant for a user planning a trip to ${destination}.
    Answer their questions about the trip, provide suggestions, and help them refine their plans.
    Use the available tools (Google Search and Google Maps) to provide accurate and up-to-date information about locations and recent events.
    Format your responses using markdown.`;
    
    const geminiHistory = buildHistory(history);

    const responseStream = ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...geminiHistory, { role: 'user', parts: [{ text: message }] }],
        config: {
            systemInstruction,
            tools: [{googleMaps: {}}, {googleSearch: {}}],
            toolConfig: location ? {
              retrievalConfig: {
                latLng: location
              }
            } : undefined,
        }
    });
    
    return responseStream;
};

export const getLivePlaces = async (location: { latitude: number, longitude: number }): Promise<SuggestedPlace[]> => {
    const ai = getAI();
    const prompt = `You are a local tour guide. Suggest 5 interesting and diverse places to visit near my current location. These could be cafes, parks, museums, landmarks, or hidden gems.

For each place, provide:
1. A name.
2. A short, engaging description.
3. A creative image prompt for generating a representative image.

Your response MUST be a valid JSON array string enclosed in a markdown code block (\`\`\`json ... \`\`\`). Do not include any other text or explanations outside of the JSON block. The JSON should follow this structure:
[
  {
    "name": "Place Name",
    "description": "Place description.",
    "image_prompt": "Image prompt."
  }
]`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: {
                    retrievalConfig: { latLng: location }
                }
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        const mapSources: { [key: string]: string } = {};
        groundingChunks.forEach(chunk => {
            if (chunk.maps) {
                mapSources[chunk.maps.title.toLowerCase()] = chunk.maps.uri;
            }
        });

        let jsonText = response.text.trim();
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1];
        } else {
             const startIndex = jsonText.indexOf('[');
             const endIndex = jsonText.lastIndexOf(']');
             if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
               jsonText = jsonText.substring(startIndex, endIndex + 1);
             } else {
               throw new Error("Could not extract a valid JSON array from the AI's response.");
             }
        }
    
        const places: SuggestedPlace[] = JSON.parse(jsonText);
        
        const imagePromises = places.map(place => generateImageForDay(place.image_prompt));
        const images = await Promise.all(imagePromises);

        places.forEach((place, index) => {
            place.image = images[index];
            place.maps_uri = mapSources[place.name.toLowerCase()];
        });

        return places;

    } catch (error) {
        console.error("Error getting live places:", error);
        throw new Error("Failed to fetch nearby places. Please try again.");
    }
};

// Fix: Added editImage function to handle image editing requests.
export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAI();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit the image. Please try again.");
    }
};

// Fix: Added generateVideo function to start the video generation process.
export const generateVideo = async (base64Image: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16') => {
    // Per Veo guidelines, create a new instance to ensure the latest API key is used.
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: base64Image,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });
    return operation;
};

// Fix: Added checkVideoOperation function to poll the status of a video generation operation.
export const checkVideoOperation = async (operation: any) => {
    // Per Veo guidelines, create a new instance to ensure the latest API key is used.
    const API_KEY = process.env.API_KEY;
    if (!API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const updatedOperation = await ai.operations.getVideosOperation({ operation: operation });
    return updatedOperation;
};
