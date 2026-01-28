import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RepairGuide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
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
  
  // For Gemini TTS (24kHz), we need to handle the raw PCM manually or use decodeAudioData
  // if the container format was supported. Gemini returns raw PCM usually.
  // However, the easiest way provided in docs is utilizing the context to decode.
  // NOTE: If Gemini returns raw PCM without headers, decodeAudioData might fail in some browsers
  // unless we wrap it in a WAV container. 
  // Let's use a robust approach: Create a buffer directly assuming standard PCM if decode fails,
  // or trust the browser's ability to decode the specific format Gemini returns.
  
  // Current 2.5 Flash TTS Preview returns raw PCM. We need to process it.
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
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore' sounds authoritative/engineering-like
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

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', // Supports thinking!
    contents: {
      parts: [
        { inlineData: { mimeType: brokenFile.type, data: brokenBase64 } },
        { inlineData: { mimeType: scrapFile.type, data: scrapBase64 } },
        { text: prompt }
      ]
    },
    config: {
      // HACKATHON WINNING FEATURE: Thinking Config
      // This tells the model to "think" about the physics before answering.
      // 2048 tokens reserved for thinking.
      thinkingConfig: { thinkingBudget: 2048 }, 
      maxOutputTokens: 8192, // Must be higher than thinking budget
      
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

export const generateRepairImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // High quality images
      contents: {
        parts: [{ text: prompt + ", photorealistic, 4k, clear focus, engineering diagram style or hands-on repair photo" }]
      },
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
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation failed", error);
    return `https://picsum.photos/800/600?random=${Math.random()}`;
  }
};