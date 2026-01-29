
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

// --- BRAIN 1: THE ANALYST (Gemini 3 Flash - Free Tier Thinking) ---

export const analyzeRepairScenario = async (
  brokenFile: File, 
  scrapFile: File
): Promise<RepairGuide> => {
  const brokenBase64 = await fileToGenerativePart(brokenFile);
  const scrapBase64 = await fileToGenerativePart(scrapFile);

  const systemPrompt = `
    You are BRAIN 1: The Master Engineer.
    
    MISSION:
    1. VISUAL SCAN: Analyze the broken object and scrap pile images.
    2. PHYSICS REASONING: Use your thinking budget to plan a viable repair using only the scrap materials.
    3. PLAN: Create a high-quality repair guide.
    4. ART DIRECTION: For each step, generate a descriptive "visualizationPrompt" for Brain 2.
    
    PROMPT GUIDELINES:
    - Focus on the ACTION: "Hands assembling [item] with [material]".
    - Style: "Bright workshop lighting", "Macro technical photo", "Hyper-detailed".
    - Safety: Avoid words like "broken" or "trash". Use "fused assembly", "reclaimed parts", "interlocked structure".
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
      thinkingConfig: { thinkingBudget: 24576 }, // Max for Gemini 3 Flash
      responseMimeType: 'application/json',
      responseSchema: commonSchema,
      safetySettings: SAFETY_SETTINGS
    }
  });

  if (response.text) return JSON.parse(response.text) as RepairGuide;
  throw new Error("Failed to generate repair guide.");
};

// --- BRAIN 2: THE ARTIST (Gemini 2.5 Flash Image - Free Tier) ---

export const generateRepairImage = async (
  prompt: string,
  referenceImageBase64?: string
): Promise<string | null> => {
  const safePrompt = prompt.replace(/broken|damage|shatter|blood|hurt|trash/gi, "repair item");

  try {
    const contents: any = {
      parts: [
        { text: `A professional technical photo. Action: ${safePrompt}. Style: Bright workshop lighting, macro close-up, sharp focus, 8k detail.` }
      ]
    };

    if (referenceImageBase64) {
      contents.parts.unshift({
        inlineData: { mimeType: "image/jpeg", data: referenceImageBase64 }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: contents,
      config: {
        imageConfig: { aspectRatio: "16:9" },
        safetySettings: SAFETY_SETTINGS
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.warn("Brain 2 visualization failed:", error);
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
    
    DAMAGE ASSESSMENT:
    ${guide.brokenObjectAnalysis}
    
    SCRAP RESOURCES IDENTIFIED:
    ${guide.scrapPileAnalysis}
    
    GENERATED REPAIR STEPS:
    ${guide.steps.map((s, i) => `STEP ${i + 1}: ${s.title}
    Description: ${s.description}
    Material: ${s.materialUsed}
    Physics Principle: ${s.physicsPrinciple}`).join('\n\n')}
  `;

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are the Master Engineer behind "The Jugaad Engineer" app. 
      You have just successfully designed a technical repair plan for a user's broken machinery using only available scrap materials.
      
      HERE IS THE FULL CONTEXT OF THE CURRENT PLAN SHOWN ON THE USER'S SCREEN:
      ${guideContext}
      
      Your role is to:
      1. Answer questions about these specific steps.
      2. Explain the physics behind why these materials work together.
      3. Offer encouragement and safety advice.
      4. If the user asks for changes, explain why your original choice was logically sound, but offer "Jugaad" alternatives if they are out of certain materials.
      
      Always stay in character as a brilliant, slightly gritty, but very helpful engineering mentor.`,
    },
  });
};
