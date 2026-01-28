import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RepairGuide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- AUDIO HELPERS ---
const decodeAudioData = async (
  base64String: string, 
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

export const generateStepAudio = async (text: string): Promise<AudioBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    return await decodeAudioData(base64Audio, audioContext);
  } catch (error) {
    console.error("Audio generation failed", error);
    throw error;
  }
};


export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const prompt = `
    You are "The Jugaad Engineer".
    
    Image 1: The broken object.
    Image 2: The scrap pile.

    Task:
    1. Identify the failure point.
    2. Analyze the scrap pile for useful physics properties.
    3. Devise a repair plan using ONLY the scrap materials.
    4. Provide 3-5 distinct steps.
    5. Provide a visualization prompt for each step.

    Output JSON.
  `;

  // USE GEMINI 3 FLASH for the logic and reasoning
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
      thinkingConfig: { thinkingBudget: 2048 }, 
      maxOutputTokens: 8192,
      
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
                physicsPrinciple: { type: Type.STRING, description: "The engineering/physics principle applied here" },
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

export const generateRepairImage = async (prompt: string, referenceImageBase64?: string): Promise<string> => {
  // Helper function to try generation
  const tryGenerate = async (model: string) => {
    const parts: any[] = [];
    
    // Provide the broken object as reference context if available
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceImageBase64
        }
      });
    }

    parts.push({ 
      text: `${prompt}. Create a photorealistic technical visualization of this repair step. High resolution, clear engineering details.` 
    });

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found");
  };

  try {
    // 1. Try Gemini 3 Pro (The Best, Hackathon Requirement)
    return await tryGenerate('gemini-3-pro-image-preview');
  } catch (error) {
    console.warn("Gemini 3 Pro Image failed, attempting fallback to 2.5", error);
    try {
      // 2. Fallback to Gemini 2.5 Flash Image (Reliable)
      // Note: 2.5 Flash Image might not support imageConfig the same way in all environments, 
      // but usually accepts the call.
      return await tryGenerate('gemini-2.5-flash-image');
    } catch (fallbackError) {
      console.error("All image generation failed", fallbackError);
      // 3. Last Resort: Blueprint Placeholder (Not random forest)
      return `https://placehold.co/1024x576/1e293b/94a3b8?text=Visualization+Unavailable+(Blueprint+Mode)`;
    }
  }
};