
export type ActionType = 'CUT' | 'TIE' | 'HEAT' | 'GLUE' | 'ASSEMBLE' | 'SUPPORT' | 'MEASURE' | 'CLEAN' | 'GENERIC';

export interface RepairStep {
  title: string;
  description: string;
  materialUsed: string;
  physicsPrinciple: string;
  actionType: ActionType;
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
  READY = 'READY',
  ERROR = 'ERROR'
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
