
import { GoogleGenAI, Type, Modality, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { RepairGuide, ActionType } from '../types';

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
        // Keep 512 for optimal speed/quality balance
        const MAX_SIZE = 512; 

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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); 
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

// Relaxed safety settings to allow for tools and repair imagery
const RELAXED_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// --- BRAIN 1: THE ANALYST (Gemini 3 Flash - Thinking) ---
// This step scans images, THINKS about the repair, and DIRECTS Brain 2.

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File,
  apiKey: string
): Promise<RepairGuide> => {
  const safeKey = apiKey?.trim();
  if (!safeKey || safeKey.length < 10) throw new Error("API Key is missing or invalid");
  
  const ai = new GoogleGenAI({ apiKey: safeKey });
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Jugaad Mechanic.
    
    MISSION:
    1. Analyze broken object & scrap pile.
    2. Create a repair guide.
    3. DIRECT BRAIN 2 (The Artist) on what to visualize.
    
    TONE: Simple, encourage, no jargon.
    
    CRITICAL: Write a 'visualizationPrompt' for each step for a Nano Banana model (Photorealistic, close-up, high contrast).
    
    OUTPUT JSON:
    - actionType: ['CUT', 'TIE', 'HEAT', 'GLUE', 'ASSEMBLE', 'SUPPORT', 'MEASURE', 'CLEAN', 'GENERIC']
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
            visualizationPrompt: { type: Type.STRING },
            actionType: { type: Type.STRING, enum: ['CUT', 'TIE', 'HEAT', 'GLUE', 'ASSEMBLE', 'SUPPORT', 'MEASURE', 'CLEAN', 'GENERIC'] }
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

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', 
    contents: { parts: imageParts },
    config: {
      // PERFORMANCE: Budget 512 is plenty for JSON extraction but much faster than 2048
      thinkingConfig: { thinkingBudget: 512 }, 
      responseMimeType: 'application/json',
      responseSchema: commonSchema,
      safetySettings: RELAXED_SAFETY
    }
  });

  if (response.text) {
    try {
      const data = JSON.parse(response.text);
      // STRICT VALIDATION: Ensure steps is always an array to prevent UI crashes
      const safeSteps = Array.isArray(data.steps) ? data.steps : [];
      
      return {
        title: data.title || "Repair Guide",
        summary: data.summary || "Analysis complete.",
        brokenObjectAnalysis: data.brokenObjectAnalysis || "",
        scrapPileAnalysis: data.scrapPileAnalysis || "",
        steps: safeSteps
      } as RepairGuide;
    } catch (e) {
      console.error("Failed to parse repair guide JSON", e);
      // Fallback object to prevent crash
      return {
        title: "Analysis Failed",
        summary: "Could not generate a valid guide. Please try again.",
        brokenObjectAnalysis: "Error",
        scrapPileAnalysis: "Error",
        steps: []
      };
    }
  }
  throw new Error("Failed to generate repair guide.");
};

// --- BRAIN 2: THE ARTIST (Gemini 2.5 Flash Image - Nano Banana) ---
// This acts on the visualizationPrompt generated by Brain 1.

export const generateRepairImage = async (prompt: string, apiKey: string): Promise<string | null> => {
  const safeKey = apiKey?.trim();
  // If no key is provided (e.g. strict Demo Mode), return null immediately so we stay in Blueprint mode.
  if (!safeKey || safeKey.length < 10) return null;

  const ai = new GoogleGenAI({ apiKey: safeKey });
  
  // Clean prompt to ensure safety compliance and enhance Brain 1's instructions
  const safePrompt = prompt
    .replace(/blood|injury|weapon|violence/gi, "")
    + ", realistic, high quality, 4k, instructional photography style, bright focused lighting";

  try {
    // USING NANO BANANA MODEL AS REQUESTED
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: safePrompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }, 
        safetySettings: RELAXED_SAFETY
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    // Log cleaner message for quotas
    console.warn("Image gen failed (quota or safety). Reverting to blueprint.");
  }
  return null;
};

// --- TTS & CHAT ---
export const generateStepAudio = async (text: string, apiKey: string): Promise<AudioBuffer> => {
  const safeKey = apiKey?.trim();
  if (!safeKey) throw new Error("No API Key");
  const ai = new GoogleGenAI({ apiKey: safeKey });
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

export const initChatSession = (guide: RepairGuide, apiKey: string): Chat => {
  const safeKey = apiKey?.trim();
  const ai = new GoogleGenAI({ apiKey: safeKey });
  
  // Safe mapping with fallback for steps
  const stepsList = Array.isArray(guide.steps) ? guide.steps : [];
  const stepsContext = stepsList.length > 0 
    ? stepsList.map((s, i) => `STEP ${i + 1} [${s.actionType}]: ${s.title} - ${s.description}`).join('\n')
    : 'No specific steps provided. Rely on summary.';

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      thinkingConfig: { thinkingBudget: 1024 },
      systemInstruction: `
        You are the 'Jugaad Engineer'.
        Keep answers SHORT, SIMPLE, and ENCOURAGING.
        The user is following a guide. Context provided below:
        
        PROJECT: ${guide.title}
        SUMMARY: ${guide.summary}
        STEPS:
        ${stepsContext}
      `,
    },
  });
};
