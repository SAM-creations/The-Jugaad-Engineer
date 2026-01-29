
import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { ChatDrawer } from './components/ChatDrawer';
import { analyzeRepairScenario, generateRepairImage, fileToGenerativePart } from './services/geminiService';
import { AppState, RepairGuide, ImageSize } from './types';
import { Wrench, Zap, AlertCircle, MessageSquare, KeyRound, Settings } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [brokenImage, setBrokenImage] = useState<File | null>(null);
  const [scrapImage, setScrapImage] = useState<File | null>(null);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);
  const [scrapPreview, setScrapPreview] = useState<string | null>(null);
  const [repairGuide, setRepairGuide] = useState<RepairGuide | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [imageSize, setImageSize] = useState<ImageSize>("1K");

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

  const openKeySelection = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume success after dialog trigger per instructions
      startAnalysis();
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const startAnalysis = async () => {
    // Check if key is needed for Pro models
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      setAppState(AppState.NEEDS_KEY);
      return;
    }

    if (!brokenImage || !scrapImage) return;

    setAppState(AppState.ANALYZING);
    setErrorMessage(null);

    try {
      const guide = await analyzeRepairScenario(brokenImage, scrapImage);
      setRepairGuide(guide);
      setAppState(AppState.GENERATING_IMAGES);

      const referenceBase64 = await fileToGenerativePart(brokenImage);
      const updatedSteps = [...guide.steps];
      
      // Sequential Pro-Generation to ensure maximum quality and stability
      for (let i = 0; i < updatedSteps.length; i++) {
        const step = updatedSteps[i];
        const visualPrompt = step.visualizationPrompt;
        
        try {
          const imageUrl = await generateRepairImage(visualPrompt, imageSize, referenceBase64);
          if (imageUrl) {
            updatedSteps[i] = { ...step, generatedImageUrl: imageUrl };
            setRepairGuide(prev => prev ? ({ ...prev, steps: [...updatedSteps] }) : null);
          }
        } catch (imgError) {
           console.error(`Step ${i} Image Error:`, imgError);
        }
      }

      setAppState(AppState.READY);

    } catch (error: any) {
      console.error("App Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        setAppState(AppState.NEEDS_KEY);
      } else {
        setAppState(AppState.ERROR);
        setErrorMessage(error.message || "Brain synchronization failed.");
      }
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setBrokenImage(null);
    setScrapImage(null);
    setRepairGuide(null);
    setErrorMessage(null);
  };

  if (appState === AppState.NEEDS_KEY) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <KeyRound size={40} className="text-amber-500" />
          </div>
          <h2 className="text-3xl font-bold text-white">Unlock Gemini 3 Pro</h2>
          <p className="text-slate-400">
            To use the **Master Engineer Brain** and **Nano Banana Pro Visuals**, you must select a paid API key from your project.
          </p>
          <div className="p-4 bg-slate-900/50 rounded-xl text-xs text-left text-slate-500 border border-slate-700">
            Note: Pro models require an API key from a project with billing enabled. 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-amber-500 hover:underline block mt-1">Learn about billing</a>
          </div>
          <button 
            onClick={openKeySelection}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            Select API Key & Launch
          </button>
          <button onClick={() => setAppState(AppState.IDLE)} className="text-slate-500 hover:text-white text-sm">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-amber-500/30">
      {appState === AppState.ANALYZING && <AnalysisLoading />}

      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center"><Wrench size={18} className="text-slate-900" /></div>
            <span className="font-display font-bold text-xl hidden md:block">The Jugaad Engineer</span>
          </div>
          <div className="flex items-center gap-6">
             {appState === AppState.IDLE && (
               <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                 <Settings size={14} className="text-slate-400" />
                 <select 
                   value={imageSize} 
                   onChange={(e) => setImageSize(e.target.value as ImageSize)}
                   className="bg-transparent text-xs font-bold text-amber-400 outline-none cursor-pointer"
                 >
                   <option value="1K">1K RESOLUTION</option>
                   <option value="2K">2K RESOLUTION</option>
                   <option value="4K">4K RESOLUTION</option>
                 </select>
               </div>
             )}
             {repairGuide && <button onClick={() => setIsChatOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-full font-bold text-xs"><MessageSquare size={14} /> ASK ENGINEER</button>}
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8">
        {(appState === AppState.IDLE || appState === AppState.ERROR) && (
          <div className="max-w-4xl mx-auto pt-8 md:pt-16 animate-fadeIn">
            <div className="text-center mb-12 space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
                Fix it with <span className="text-amber-500">Jugaad.</span>
              </h1>
              <p className="text-xl text-slate-400">Master Engineer Brain 1 & Nano Banana Pro Brain 2</p>
            </div>

            {appState === AppState.ERROR && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-1" />
                <p className="text-slate-300 text-sm">{errorMessage}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
              <ImageUploader label="Input A: The Problem" description="Photo of broken object" onImageSelected={handleBrokenImage} previewUrl={brokenPreview} />
              <ImageUploader label="Input B: The Resources" description="Photo of scrap pile" onImageSelected={handleScrapImage} previewUrl={scrapPreview} />
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={startAnalysis}
                disabled={!brokenImage || !scrapImage}
                className={`group px-12 py-6 rounded-2xl font-bold text-xl transition-all flex items-center gap-3 ${(!brokenImage || !scrapImage) ? 'bg-slate-800 text-slate-500' : 'bg-amber-500 text-slate-900 shadow-2xl hover:scale-105 shadow-amber-500/20'}`}
              >
                <Zap size={24} fill="currentColor" />
                <span>Synchronize Pro Brains</span>
              </button>
            </div>
          </div>
        )}

        {(appState === AppState.GENERATING_IMAGES || appState === AppState.READY) && repairGuide && (
           <RepairGuideView guide={repairGuide} onReset={resetApp} onOpenChat={() => setIsChatOpen(true)} />
        )}
      </main>

      {repairGuide && <ChatDrawer guide={repairGuide} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default App;
