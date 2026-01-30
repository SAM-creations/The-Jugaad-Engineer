
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

// Relaxed safety settings
const RELAXED_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// --- BRAIN 1: THE ANALYST (Gemini 3 Flash - Thinking) ---

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File,
  apiKey: string
): Promise<RepairGuide> => {
  const ai = new GoogleGenAI({ apiKey });
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Jugaad Mechanic (The Friendly Village Expert).
    
    MISSION:
    1. Analyze the broken object and the scrap pile.
    2. Create a detailed, easy-to-follow repair guide.
    
    TONE:
    - Warm, encouraging, and simple. 
    - Imagine you are explaining this to a regular person in a village or city who is not an engineer.
    - NO confusing jargon. Use "stick" instead of "structural member". Use "tie" instead of "fasten".
    
    STEP REQUIREMENTS:
    - Detailed descriptions: Don't just say "Cut the tube". Say "Use your scissors to cut the bicycle tube into long, thin strips, about as wide as your finger. These will be our strong rubber bands."
    - Visualization Prompt: Write a clear description of what the step looks like so an artist can draw it. e.g., "Close up view of hands using scissors to cut a black rubber inner tube into strips on a wooden table."
    
    OUTPUT JSON:
    - actionType: Choose from ['CUT', 'TIE', 'HEAT', 'GLUE', 'ASSEMBLE', 'SUPPORT', 'MEASURE', 'CLEAN', 'GENERIC']
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
      thinkingConfig: { thinkingBudget: 2048 }, // Increased slightly for better text detail
      responseMimeType: 'application/json',
      responseSchema: commonSchema,
      safetySettings: RELAXED_SAFETY
    }
  });

  if (response.text) return JSON.parse(response.text) as RepairGuide;
  throw new Error("Failed to generate repair guide.");
};

// --- BRAIN 2: THE ARTIST (Gemini 2.5 Flash Image) ---

export const generateRepairImage = async (prompt: string, apiKey: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey });
  // Safe-guard the prompt to avoid safety filters on tools
  const safePrompt = prompt
    .replace(/blood|injury|weapon|violence/gi, "")
    + ", realistic, high quality, instructional photography style, bright lighting";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: safePrompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9" }, // Standard image ratio
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
    console.warn("Image gen failed (likely safety or quota), returning null to keep blueprint icon.", e);
  }
  return null;
};

// --- TTS & CHAT ---
export const generateStepAudio = async (text: string, apiKey: string): Promise<AudioBuffer> => {
  const ai = new GoogleGenAI({ apiKey });
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
  const ai = new GoogleGenAI({ apiKey });
  const guideContext = `
    CURRENT REPAIR PROJECT: ${guide.title}
    SUMMARY: ${guide.summary}
    STEPS: ${guide.steps.map((s, i) => `STEP ${i + 1} [${s.actionType}]: ${s.title} - ${s.description}`).join('\n')}
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      thinkingConfig: { thinkingBudget: 1024 },
      systemInstruction: `
        You are the 'Jugaad Engineer'.
        Keep answers SHORT, SIMPLE, and ENCOURAGING.
        The user is following a guide. Context provided above.
      `,
    },
  });
};
