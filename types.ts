export interface RepairStep {
  title: string;
  description: string;
  materialUsed: string;
  physicsPrinciple: string;
  visualizationPrompt: string;
  generatedImageUrl?: string;
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
  ERROR = 'ERROR'
}

export interface AnalyzedImages {
  brokenUrl: string;
  scrapUrl: string;
  brokenFile: File;
  scrapFile: File;
}
