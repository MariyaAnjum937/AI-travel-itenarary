export interface Activity {
  time: string;
  activity: string;
  location: string;
  duration: string;
  description: string;
  notes?: string;
}

export interface ItineraryDay {
  day: number;
  schedule: Activity[];
  image?: string;
  image_prompt?: string;
}

export interface MapSource {
  uri: string;
  title: string;
}
export interface WebSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  sources?: {
    maps?: MapSource[];
    web?: WebSource[];
  }
}

export interface SuggestedPlace {
  name: string;
  description: string;
  image_prompt: string;
  image?: string;
  maps_uri?: string;
}