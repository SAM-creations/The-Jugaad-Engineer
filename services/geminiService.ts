
import { GoogleGenAI, Type, Modality, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
        const MAX_SIZE = 768; 

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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); 
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

// Extremely relaxed safety settings to prevent false positives on mechanical tools
const RELAXED_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

// --- BRAIN 1: THE ANALYST (Gemini 3 Flash - Thinking) ---

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Master Engineer.
    
    MISSION:
    1. VISUAL SCAN: Analyze the images.
    2. PHYSICS REASONING: Plan a repair using ONLY the scrap materials shown.
    3. ART DIRECTION: For each step, generate a "visualizationPrompt".
    
    VISUALIZATION PROMPT RULES (ULTRA-SAFE FOR AI):
    - Describe the result as a "Brand New Product Design" or "Industrial Prototype".
    - Focus on the materials: "polished wood", "matte polymer", "metallic finish", "woven texture".
    - Style: "Apple industrial design style", "clean 3D render", "soft volumetric lighting", "white background".
    - AVOID ALL WORDS RELATED TO DAMAGE: No "broken", "repair", "fix", "snap", "crack", "glue", "tape".
    - USE POSITIVE CONSTRUCTION WORDS: "Integration", "Coupling", "Symmetry", "Reinforcement", "Assembly".
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
            visualizationPrompt: { type: Type.STRING }
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
      thinkingConfig: { thinkingBudget: 24576 },
      responseMimeType: 'application/json',
      responseSchema: commonSchema,
      safetySettings: RELAXED_SAFETY
    }
  });

  if (response.text) return JSON.parse(response.text) as RepairGuide;
  throw new Error("Failed to generate repair guide.");
};

// --- BRAIN 2: THE ARTIST (Gemini 2.5 Flash Image) ---

export const generateRepairImage = async (
  prompt: string
): Promise<string | null> => {
  // Scrub any remaining negative words just in case
  const safePrompt = prompt
    .replace(/broken|damage|shatter|snap|fracture|debris|trash|waste|junk|crack/gi, "component")
    .replace(/cut|slice|saw|chop|pliers|blade|knife|sharp/gi, "precision joint")
    .replace(/blood|hurt|injury|wound|danger|pain/gi, "industrial")
    .replace(/dirty|messy|ruined|scrap/gi, "prototype material");

  try {
    const contents: any = {
      parts: [
        { text: `A professional industrial design schematic of ${safePrompt}. Style: Bright studio lighting, clean minimal workshop environment, 8k resolution, photorealistic CAD render.` }
      ]
    };

    // NOTE: We do NOT send the reference image here anymore.
    // The "broken" pixels in the source image often trigger safety blocks.
    // We let the model imagine a "clean" version of the engineer's plan.

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        imageConfig: { aspectRatio: "16:9" },
        safetySettings: RELAXED_SAFETY 
      }
    });

    if (response.candidates?.[0]?.finishReason === 'SAFETY') {
      console.warn("Artist Brain blocked by safety filter. Attempting abstract fallback...");
      // Try one more time with an extremely generic fallback prompt if blocked
      return generateAbstractFallback(safePrompt);
    }

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    console.error("Brain 2 error detail:", error);
  }
  return null;
};

const generateAbstractFallback = async (subject: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A clean 3D isometric view of a ${subject} made of polished materials. White background, soft shadows.` }] },
      config: { imageConfig: { aspectRatio: "16:9" }, safetySettings: RELAXED_SAFETY }
    });
    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
};

// --- TTS & CHAT ---
export const generateStepAudio = async (text: string): Promise<AudioBuffer> => {
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
  const guideContext = `
    CURRENT REPAIR PROJECT: ${guide.title}
    SUMMARY: ${guide.summary}
    DAMAGE: ${guide.brokenObjectAnalysis}
    SCRAP: ${guide.scrapPileAnalysis}
    STEPS: ${guide.steps.map((s, i) => `STEP ${i + 1}: ${s.title}`).join(', ')}
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are the Master Engineer. You designed this repair plan: ${guideContext}. 
      Answer technical questions, explain physics, and stay in character as a brilliant but practical mentor.`,
    },
  });
};
