import { GeminiAdapter } from '../services/models/gemini';

declare global {
  interface Window {
    env: {
      API_KEY: string;
    };
    GeminiAdapter: typeof GeminiAdapter;
  }
}

export default function () {
  window.env = {
    API_KEY: '__GEMINI_API_KEY__',
  };

  window.GeminiAdapter = GeminiAdapter;
}
