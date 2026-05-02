import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API key. Please check your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const generateChatResponse = async (prompt: string, history: any[] = [], systemInstruction?: string) => {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview"; 
    
    // Format history for the @google/genai SDK
    const formattedContents = history.map(item => ({
      role: item.role === "bot" || item.role === "model" ? "model" : "user",
      parts: item.parts || [{ text: item.text }]
    }));

    // Add current prompt
    formattedContents.push({ role: "user", parts: [{ text: prompt }] });

    const response = await ai.models.generateContent({
      model,
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};

export const generateContent = async (prompt: string) => {
  return generateChatResponse(prompt);
};
