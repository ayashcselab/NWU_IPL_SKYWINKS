import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const geminiProModel = "gemini-3.1-pro-preview";
export const geminiFlashLiteModel = "gemini-3.1-flash-lite-preview";

export async function generateThinkingResponse(prompt: string, history: any[] = []) {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: geminiProModel,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      systemInstruction: "You are a highly intelligent travel assistant for SkyWinks. You help users with complex travel planning, itinerary optimization, and detailed travel advice. Use your deep reasoning capabilities to provide comprehensive and thoughtful answers."
    },
  });

  return response.text;
}

export async function generateQuickResponse(prompt: string, history: any[] = []) {
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: geminiFlashLiteModel,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      systemInstruction: "You are a helpful and fast travel assistant for SkyWinks. Provide concise, accurate, and quick answers to user queries about flights, destinations, and travel tips."
    },
  });

  return response.text;
}
