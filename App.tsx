import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { analyzeRepairScenario, generateRepairImage, fileToGenerativePart } from './services/geminiService';
import { AppState, RepairGuide } from './types';
import { Wrench, Zap, FileText, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [brokenImage, setBrokenImage] = useState<File | null>(null);
  const [scrapImage, setScrapImage] = useState<File | null>(null);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);
  const [scrapPreview, setScrapPreview] = useState<string | null>(null);
  const [repairGuide, setRepairGuide] = useState<RepairGuide | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBrokenImage = (file: File | null) => {
    setBrokenImage(file);
    setBrokenPreview(file ? URL.createObjectURL(file) : null);
    setErrorMessage(null);
  };

  const handleScrapImage = (file: File | null) => {
    setScrapImage(file);
    setScrapPreview(file ? URL.createObjectURL(file) : null);
    setErrorMessage(null);
  };

  const startAnalysis = async () => {
    if (!brokenImage || !scrapImage) return;

    setAppState(AppState.ANALYZING);
    setErrorMessage(null);

    try {
      // BRAIN 1: Analysis
      console.log("Activating Brain 1: Gemini 3 Flash...");
      const guide = await analyzeRepairScenario(brokenImage, scrapImage);
      
      // Setup guide state immediately so user sees text while images load
      setRepairGuide(guide);
      setAppState(AppState.GENERATING_IMAGES);

      // BRAIN 2: Visualization
      console.log("Activating Brain 2: Gemini 2.5 Flash Image...");
      
      // Use the compressed/resized base64 for the reference image to keep it fast
      const referenceBase64 = await fileToGenerativePart(brokenImage);

      const updatedSteps = [...guide.steps];
      
      const imagePromises = updatedSteps.map(async (step, index) => {
        // Feed the specific visualization prompt from Brain 1 into Brain 2
        const visualPrompt = step.visualizationPrompt || step.description;
        const imageUrl = await generateRepairImage(visualPrompt, referenceBase64);
        updatedSteps[index] = { ...step, generatedImageUrl: imageUrl };
        
        // Progressive update
        setRepairGuide(prev => prev ? ({ ...prev, steps: [...updatedSteps] }) : null);
      });

      await Promise.all(imagePromises);
      setAppState(AppState.READY);

    } catch (error: any) {
      console.error("Full Application Error:", error);
      setAppState(AppState.ERROR);
      setErrorMessage(error.message || "An unexpected error occurred connecting to the Gemini 3 API.");
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setBrokenImage(null);
    setScrapImage(null);
    setBrokenPreview(null);
    setScrapPreview(null);
    setRepairGuide(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 selection:bg-amber-500/30">
      
      {appState === AppState.ANALYZING && <AnalysisLoading />}

      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Wrench size={18} className="text-slate-900" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">The Jugaad Engineer</span>
          </div>
          <div className="text-xs font-mono text-slate-500 hidden sm:block">
            HACKATHON 2026 • GEMINI 3 POWERED
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8">
        {(appState === AppState.IDLE || appState === AppState.ERROR) && (
          <div className="max-w-4xl mx-auto pt-8 md:pt-16 animate-fadeIn">
            <div className="text-center mb-12 space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold font-display leading-tight">
                Broken Essential? <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Fix it with Junk.</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Upload a photo of your broken machinery and your available scrap pile. 
                <strong>Brain 1</strong> (Gemini 3) scans the physics. <strong>Brain 2</strong> (Gemini Vision) draws the fix.
              </p>
            </div>

            {appState === AppState.ERROR && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 text-left">
                <AlertCircle className="text-red-500 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-400">Analysis Failed</h3>
                  <p className="text-slate-300 text-sm">{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 bg-slate-800/50 p-6 md:p-8 rounded-2xl border border-slate-700/50 shadow-2xl">
              <ImageUploader 
                label="Input A: The Problem" 
                description="Upload a photo of the broken object."
                onImageSelected={handleBrokenImage}
                previewUrl={brokenPreview}
              />
              <ImageUploader 
                label="Input B: The Resources" 
                description="Upload a photo of available scrap/trash."
                onImageSelected={handleScrapImage}
                previewUrl={scrapPreview}
              />
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={startAnalysis}
                disabled={!brokenImage || !scrapImage}
                className={`
                  relative overflow-hidden group px-8 py-5 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3
                  ${(!brokenImage || !scrapImage) 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-105'
                  }
                `}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <Zap size={20} className={(!brokenImage || !scrapImage) ? '' : 'fill-current'} />
                <span>Start Dual-Brain Analysis</span>
              </button>
            </div>
            
            <div className="mt-16 grid grid-cols-3 gap-4 text-center opacity-50">
               <div className="p-4 border border-slate-700 rounded-lg">
                  <div className="font-bold text-amber-400 mb-1">Brain 1</div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Gemini 3 Flash</div>
                  <div className="text-sm">Scans, Thinks & Plans</div>
               </div>
               <div className="p-4 border border-slate-700 rounded-lg">
                  <div className="font-bold text-amber-400 mb-1">Brain 2</div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Gemini 2.5 Flash</div>
                  <div className="text-sm">Visualizes the Solution</div>
               </div>
               <div className="p-4 border border-slate-700 rounded-lg">
                  <div className="font-bold text-amber-400 mb-1">System</div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Orchestrator</div>
                  <div className="text-sm">Links the two brains</div>
               </div>
            </div>
          </div>
        )}

        {(appState === AppState.GENERATING_IMAGES || appState === AppState.READY) && repairGuide && (
           <RepairGuideView guide={repairGuide} onReset={resetApp} />
        )}
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;