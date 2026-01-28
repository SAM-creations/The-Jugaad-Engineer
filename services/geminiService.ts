import { GoogleGenAI, Type, Modality } from "@google/genai";
import { RepairGuide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILITIES ---

/**
 * BRAIN INPUT PRE-PROCESSOR
 * Resizes and compresses images to ensure API stability and fast upload.
 * Large 4K/raw images often cause network timeouts or payload limits.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Limit max dimension to 1536px (optimal for Gemini vision)
        const MAX_SIZE = 1536; 

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           reject(new Error("Could not get canvas context"));
           return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG 0.85 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (e) => reject(e);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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

// --- BRAIN 1: THE ANALYST ---
// Model: gemini-3-pro-preview
// Role: Visual Cortex + Logic Center + Physics Engine

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  
  // Pre-process inputs
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const prompt = `
    You are BRAIN 1: The Master Engineer.
    
    INPUTS:
    - Image A: A broken object.
    - Image B: A pile of scrap materials.

    MISSION:
    1. VISUAL SCAN: Analyze Image A to find the mechanical failure.
    2. RESOURCE SCAN: Analyze Image B to find materials with useful properties (elasticity, rigidity, conductivity, etc.).
    3. PHYSICS SIMULATION: 'Think' about how to combine specific scrap items to fix the broken object.
    4. OUTPUT: A structured repair guide.

    CRITICAL INSTRUCTION FOR "visualizationPrompt":
    You must output a prompt for BRAIN 2 (The Artist).
    Describe the scene vividly so BRAIN 2 can draw it.
    Example: "Macro shot of a blue plastic pen being taped to a broken glasses arm using silver duct tape, hands visible holding it tight."

    Return JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: brokenBase64 } },
          { inlineData: { mimeType: "image/jpeg", data: scrapBase64 } },
          { text: prompt }
        ]
      },
      config: {
        // Enable "Thinking" for deep reasoning about physics
        thinkingConfig: { thinkingBudget: 2048 }, 
        maxOutputTokens: 8192,
        
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            brokenObjectAnalysis: { type: Type.STRING },
            scrapPileAnalysis: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  materialUsed: { type: Type.STRING },
                  physicsPrinciple: { type: Type.STRING },
                  visualizationPrompt: { type: Type.STRING, description: "Instructions for Brain 2 to generate the image" }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Brain 1 (Gemini 3 Pro) returned empty response.");
    
    return JSON.parse(text) as RepairGuide;
  } catch (error) {
    console.error("Brain 1 Analysis Failed:", error);
    throw error;
  }
};

// --- BRAIN 2: THE ARTIST ---
// Model: gemini-2.5-flash-image
// Role: Visualizer + Illustrator

export const generateRepairImage = async (
  prompt: string,
  referenceImageBase64?: string
): Promise<string> => {
  try {
    const parts: any[] = [];
    
    // Provide context if available (The Broken Object)
    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: referenceImageBase64
        }
      });
    }

    // Enhance prompt for the image model
    const enhancedPrompt = `
      Create a photorealistic instructional image.
      Action to Depict: ${prompt}
      Style: High-definition repair manual photography, clear focus on the hands and materials, workshop workbench background.
    `;

    parts.push({ text: enhancedPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Brain 2 (Image Gen) did not return an image.");

  } catch (error) {
    console.error("Brain 2 Generation Failed:", error);
    // Return a visible error placeholder so the UI doesn't crash
    return `https://placehold.co/1024x576/334155/94a3b8?text=Visualization+Error`;
  }
};

// --- TTS HELPER ---
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