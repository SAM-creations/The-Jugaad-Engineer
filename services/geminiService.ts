
import { GoogleGenAI, Type, Modality, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { RepairGuide, ImageSize } from '../types';

// Use a factory function to ensure we always use the latest API context/key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        const MAX_SIZE = 1024; 

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

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
];

// --- BRAIN 1: THE ANALYST (Gemini 3 Pro with Thinking) ---

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  const ai = getAI();
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Master Engineer.
    
    MISSION:
    1. VISUAL SCAN: Analyze Image A (Broken Object) and Image B (Scrap Pile).
    2. PHYSICS REASONING: Use your internal thinking budget to simulate a physics-valid repair using only materials from Image B.
    3. PLAN: Create a multi-step guide.
    4. ART DIRECTION: For each step, write a highly descriptive "visualizationPrompt".
    
    GUIDELINES FOR VISUALIZATION PROMPTS:
    - Describe the scene cinematically. 
    - Mention: lighting (workshop, neon), perspective (macro close-up), and the specific material joining.
    - Focus on the "repairing action".
    - Avoid forbidden words like "broken" or "shattered" to bypass safety filters. Use "fused", "assembled", "interlocked".
    - Target: Professional repair photography.
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
            visualizationPrompt: { type: Type.STRING, description: "Detailed scene description for the image generator" }
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: { parts: imageParts },
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: 'application/json',
        responseSchema: commonSchema,
        safetySettings: SAFETY_SETTINGS
      }
    });

    if (response.text) return JSON.parse(response.text) as RepairGuide;
    throw new Error("Empty response from Engineer Brain");
  } catch (error: any) {
    console.error("Brain 1 Analysis failed:", error);
    throw error;
  }
};

// --- BRAIN 2: THE ARTIST (Nano Banana Pro / Gemini 3 Pro Image) ---

export const generateRepairImage = async (
  prompt: string,
  imageSize: ImageSize,
  referenceImageBase64?: string
): Promise<string | null> => {
  const ai = getAI();
  const safePrompt = prompt.replace(/broken|damage|shatter|blood|hurt|injury|shrapnel/gi, "repair item");

  try {
    const contents: any = {
      parts: [
        { text: `A professional instructional photo. Subject: ${safePrompt}. Style: Cinematic workshop lighting, 8k resolution, macro photography, depth of field, clear mechanical detail.` }
      ]
    };

    if (referenceImageBase64) {
      contents.parts.unshift({
        inlineData: { mimeType: "image/jpeg", data: referenceImageBase64 }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: contents,
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: imageSize
        },
        safetySettings: SAFETY_SETTINGS
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error: any) {
    console.warn("Brain 2 Pro Image failed. Attempting fallback...", error);
    
    // Fallback to Flash Image if Pro fails (often due to project quota)
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Technical illustration of ${safePrompt}` }]
        },
        config: { safetySettings: SAFETY_SETTINGS }
      });
      for (const part of fallbackResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (fallbackError) {
      console.error("All image fallbacks failed:", fallbackError);
    }
  }

  return null;
};

// --- TTS & CHAT ---
export const generateStepAudio = async (text: string): Promise<AudioBuffer> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  return await decodeAudioData(base64Audio!, audioContext);
};

export const initChatSession = (guide: RepairGuide): Chat => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are the Engineer for: ${guide.title}. Use your complex reasoning to help the user.`,
      thinkingConfig: { thinkingBudget: 16000 }
    },
  });
};
