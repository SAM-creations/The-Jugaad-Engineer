import { GoogleGenAI, Type } from "@google/genai";
import { RepairGuide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const prompt = `
    You are "The Jugaad Engineer", an expert structural engineer specializing in frugal innovation and repairs using available scrap materials.
    
    Image 1: The broken object/machine.
    Image 2: The available scrap pile (resources).

    Task:
    1. Identify the broken object and the specific failure point.
    2. Analyze the scrap pile for materials with useful physical properties (tensile strength, compression, flexibility, etc.).
    3. Devise a physics-valid repair plan to fix the object using ONLY the materials seen in the scrap pile.
    4. Provide 3-5 distinct steps for the repair.
    5. For each step, provide a detailed image generation prompt that would visualize this specific step of the repair being performed or the result of that step. The prompt should be descriptive for an AI image generator (photorealistic, close up).

    Output JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: brokenFile.type, data: brokenBase64 } },
        { inlineData: { mimeType: scrapFile.type, data: scrapBase64 } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A catchy title for the repair" },
          summary: { type: Type.STRING, description: "One sentence summary of the fix" },
          brokenObjectAnalysis: { type: Type.STRING, description: "Analysis of the damage and failure point" },
          scrapPileAnalysis: { type: Type.STRING, description: "Analysis of useful materials found in the scrap" },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                materialUsed: { type: Type.STRING },
                physicsPrinciple: { type: Type.STRING, description: "The engineering/physics principle applied here (e.g. Tension, Shear support)" },
                visualizationPrompt: { type: Type.STRING, description: "Prompt to generate an image of this step" }
              }
            }
          }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as RepairGuide;
};

export const generateRepairImage = async (prompt: string): Promise<string> => {
  // Use Gemini 2.5 Flash Image for faster generation speed
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt + ", photorealistic, 4k, clear focus, engineering diagram style or hands-on repair photo" }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
          // imageSize is not supported in 2.5 flash image, removing it
        }
      }
    });

    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed", error);
    // Return a placeholder if generation fails to avoid crashing the whole flow
    return `https://picsum.photos/800/600?random=${Math.random()}`;
  }
};