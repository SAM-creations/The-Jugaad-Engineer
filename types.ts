
export type ImageSize = "1K" | "2K" | "4K";

export interface RepairStep {
  title: string;
  description: string;
  materialUsed: string;
  physicsPrinciple: string;
  visualizationPrompt: string;
  generatedImageUrl?: string;
  audioData?: ArrayBuffer;
}

export interface RepairGuide {
  title: string;
  summary: string;
  brokenObjectAnalysis: string;
  scrapPileAnalysis: string;
  steps: RepairStep[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  READY = 'READY',
  ERROR = 'ERROR',
  NEEDS_KEY = 'NEEDS_KEY'
}

export interface AnalyzedImages {
  brokenUrl: string;
  scrapUrl: string;
  brokenFile: File;
  scrapFile: File;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}
