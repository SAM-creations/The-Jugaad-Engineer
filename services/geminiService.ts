import { GoogleGenAI, Type, Modality, Chat } from "@google/genai";
import { RepairGuide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILITIES ---

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
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

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Master Engineer.
    
    MISSION:
    1. VISUAL SCAN: Analyze Image A (Broken Object) for mechanical failure.
    2. RESOURCE SCAN: Analyze Image B (Scrap Pile) for useful materials.
    3. PHYSICS SIMULATION: 'Think' about how to fix it using ONLY the scrap.
    4. OUTPUT: A structured repair guide.

    CRITICAL: For "visualizationPrompt", describe the scene vividly so BRAIN 2 (The Artist) can draw it.
    Example: "Close up of a blue pen taped to a glasses arm with silver duct tape."
  `;

  const commonSchema = {
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
            visualizationPrompt: { type: Type.STRING, description: "Instructions for Brain 2" }
          }
        }
      }
    }
  };

  const imageParts = [
    { inlineData: { mimeType: "image/jpeg", data: brokenBase64 } },
    { inlineData: { mimeType: "image/jpeg", data: scrapBase64 } },
    { text: systemPrompt }
  ];

  try {
    console.log("Brain 1: Attempting Gemini 3 Flash...");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: imageParts },
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, 
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: commonSchema
      }
    });

    if (response.text) return JSON.parse(response.text) as RepairGuide;
  } catch (error: any) {
    console.warn("Gemini 3 Flash failed. Switching to fallback.", error);
  }

  try {
    console.log("Brain 1: Fallback to Gemini 2.5 Flash...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest', 
      contents: { parts: imageParts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: commonSchema
      }
    });

    if (response.text) return JSON.parse(response.text) as RepairGuide;
    throw new Error("Both Brain 1 models failed to generate a response.");
  } catch (fallbackError: any) {
    console.error("Brain 1 Fatal Error:", fallbackError);
    throw new Error("Analysis failed: " + fallbackError.message);
  }
};

// --- BRAIN 2: THE ARTIST ---

export const generateRepairImage = async (
  prompt: string,
  referenceImageBase64?: string
): Promise<string> => {
  
  // ATTEMPT 1: Photorealistic with Reference
  // This is best, but sometimes fails due to Safety checks on the user's uploaded image.
  if (referenceImageBase64) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: referenceImageBase64 } },
            { text: `Create a photorealistic, cinematic instructional image. Action: ${prompt}. Style: Professional repair manual photography, clear focus, workshop lighting, hands visible working, high resolution.` }
          ]
        }
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (e) {
      console.warn("Brain 2: Photorealistic attempt failed (safety or other), switching to Blueprint mode.", e);
    }
  }

  // ATTEMPT 2: Technical Illustration (Blueprint) - No Reference Image
  // This is the safety net. It almost always works because it doesn't use the "unsafe" user image.
  // It uses a distinct aesthetic (Blue/White Blueprint) so it looks intentional, not like a mistake.
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [
          { text: `Create a high-quality technical blueprint illustration. Subject: ${prompt}. Style: Engineering schematic, vector art style, white lines on technical blue background, exploded view if necessary, very detailed and precise.` }
        ]
      }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated in fallback.");
  } catch (error) {
    console.error("Brain 2 Final Failure:", error);
    // Return a stylish error placeholder
    return `https://placehold.co/1024x576/1e293b/475569?text=Visual+Unavailable`;
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

// --- CHAT HELPER ---
export const initChatSession = (guide: RepairGuide): Chat => {
  const context = `
    You are The Jugaad Engineer's Assistant.
    You are discussing a repair guide with the user.
    
    REPAIR CONTEXT:
    Title: ${guide.title}
    Summary: ${guide.summary}
    Problem: ${guide.brokenObjectAnalysis}
    Resources: ${guide.scrapPileAnalysis}
    Steps:
    ${guide.steps.map((s, i) => `${i+1}. ${s.title}: ${s.description} (Using: ${s.materialUsed})`).join('\n')}

    Be helpful, technical but accessible, and encouraging. Answer questions about the steps or alternative materials.
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: context,
    },
  });
};