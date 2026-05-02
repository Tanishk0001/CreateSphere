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
    const modelName = "gemini-1.5-flash"; // Use stable model
    
    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
    });

    // Format history for the SDK
    const formattedHistory = history.map(item => ({
      role: item.role === "bot" || item.role === "model" ? "model" : "user",
      parts: item.parts || [{ text: item.text }]
    }));

    const result = await model.generateContent({
      contents: [
        ...formattedHistory,
        { role: "user", parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};

export const generateContent = async (prompt: string) => {
  return generateChatResponse(prompt);
};
