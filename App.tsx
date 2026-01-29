
import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { ChatDrawer } from './components/ChatDrawer';
import { analyzeRepairScenario, generateRepairImage, fileToGenerativePart } from './services/geminiService';
import { AppState, RepairGuide } from './types';
import { Wrench, Zap, AlertCircle, MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [brokenImage, setBrokenImage] = useState<File | null>(null);
  const [scrapImage, setScrapImage] = useState<File | null>(null);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);
  const [scrapPreview, setScrapPreview] = useState<string | null>(null);
  const [repairGuide, setRepairGuide] = useState<RepairGuide | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
      // BRAIN 1: Think and Plan (Gemini 3 Flash Thinking)
      const guide = await analyzeRepairScenario(brokenImage, scrapImage);
      setRepairGuide(guide);
      
      // Move to next state so the UI renders the steps with "Blueprint" placeholders
      setAppState(AppState.GENERATING_IMAGES);

      // BRAIN 2: Visualize (Gemini 2.5 Flash Image)
      // Convert reference image to base64 once
      const referenceBase64 = await fileToGenerativePart(brokenImage);
      
      // PARALLEL EXECUTION: Launch all image generation requests at once
      const imagePromises = guide.steps.map(async (step, index) => {
        try {
          const imageUrl = await generateRepairImage(step.visualizationPrompt, referenceBase64);
          if (imageUrl) {
            // Update state immediately for this specific step so it "pops in"
            setRepairGuide(prev => {
              if (!prev) return null;
              const newSteps = [...prev.steps];
              newSteps[index] = { ...newSteps[index], generatedImageUrl: imageUrl };
              return { ...prev, steps: newSteps };
            });
          }
        } catch (imgError) {
          console.error(`Step ${index} visualization failed:`, imgError);
        }
      });

      // Wait for all requests to finish (or timeout/fail)
      await Promise.all(imagePromises);

      setAppState(AppState.READY);

    } catch (error: any) {
      console.error("App Error:", error);
      setAppState(AppState.ERROR);
      setErrorMessage(error.message || "Failed to synchronize the engineering brains.");
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setBrokenImage(null);
    setScrapImage(null);
    setRepairGuide(null);
    setErrorMessage(null);
    setIsChatOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      {appState === AppState.ANALYZING && <AnalysisLoading />}

      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Wrench size={18} className="text-slate-900" />
            </div>
            <span className="font-display font-bold text-xl hidden md:block tracking-tight">The Jugaad Engineer</span>
            <span className="font-display font-bold text-xl md:hidden">Jugaad Eng.</span>
          </div>
          <div className="flex items-center gap-4">
             {repairGuide && (
               <button 
                 onClick={() => setIsChatOpen(true)} 
                 className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-full font-bold text-xs hover:bg-amber-400 transition-colors"
               >
                 <MessageSquare size={14} /> 
                 <span>ASK ENGINEER</span>
               </button>
             )}
          </div>
        </div>
      </nav>

      <main className="p-4 md:p-8">
        {(appState === AppState.IDLE || appState === AppState.ERROR) && (
          <div className="max-w-4xl mx-auto pt-8 md:pt-16 animate-fadeIn">
            <div className="text-center mb-12 space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold font-display leading-tight">
                Engineering <span className="text-amber-500">Jugaad.</span>
              </h1>
              <p className="text-xl text-slate-400">Powered by Gemini 3 Flash Thinking & Vision</p>
            </div>

            {appState === AppState.ERROR && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-1" />
                <p className="text-slate-300 text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 bg-slate-800/50 p-6 rounded-3xl border border-slate-700 shadow-2xl">
              <ImageUploader label="The Broken Object" description="Photo of failure point" onImageSelected={handleBrokenImage} previewUrl={brokenPreview} />
              <ImageUploader label="The Scrap Pile" description="Photo of available materials" onImageSelected={handleScrapImage} previewUrl={scrapPreview} />
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={startAnalysis}
                disabled={!brokenImage || !scrapImage}
                className={`group px-12 py-6 rounded-2xl font-bold text-xl transition-all flex items-center gap-3 ${(!brokenImage || !scrapImage) ? 'bg-slate-800 text-slate-500' : 'bg-amber-500 text-slate-900 shadow-2xl hover:scale-105 shadow-amber-500/30'}`}
              >
                <Zap size={24} fill="currentColor" />
                <span>Launch Analysis</span>
              </button>
            </div>
            
            <div className="mt-16 text-center text-slate-500 text-xs uppercase tracking-widest font-mono">
              Synchronizing Dual-Brain Flash Engine (Thinking Mode Active)
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
