
import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { ChatDrawer } from './components/ChatDrawer';
import { analyzeRepairScenario } from './services/geminiService';
import { DEMO_GUIDE } from './services/demoService';
import { AppState, RepairGuide } from './types';
import { Wrench, Zap, AlertCircle, MessageSquare, PlayCircle } from 'lucide-react';

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
      // Step 1: Brain 1 Analysis (Returns Action Types for Blueprint Mode)
      const guide = await analyzeRepairScenario(brokenImage, scrapImage);
      setRepairGuide(guide);
      
      // BLUEPRINT MODE: Skip image generation. Go straight to Ready.
      setAppState(AppState.READY);

    } catch (error: any) {
      console.error("App Error:", error);
      setAppState(AppState.ERROR);
      
      if (error.message?.includes('API key') || error.message?.includes('400') || error.message?.includes('403')) {
         setErrorMessage("API Key Error: The provided key is expired or invalid. Please renew it.");
      } else {
         setErrorMessage(error.message || "The engineering logic failed. Please try a clearer photo or check your connection.");
      }
    }
  };

  const runDemoSimulation = async () => {
    setAppState(AppState.ANALYZING);
    setErrorMessage(null);
    setRepairGuide(null);
    
    // Simulate Analysis Time
    await new Promise(resolve => setTimeout(resolve, 2500));

    setRepairGuide(DEMO_GUIDE);
    setAppState(AppState.READY);
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
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
             {appState === AppState.IDLE && (
                 <button 
                  onClick={runDemoSimulation}
                  className="text-xs font-mono text-slate-500 hover:text-amber-400 transition-colors border border-slate-800 hover:border-amber-500/50 px-3 py-1 rounded"
                 >
                   DEMO MODE
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
              <p className="text-xl text-slate-400 text-balance">The Master AI Agent for Frugal Repair & Resourcefulness</p>
            </div>

            {appState === AppState.ERROR && (
              <div className="mb-8 p-6 bg-red-500/10 border border-red-500/50 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" />
                    <div>
                        <p className="text-slate-300 text-sm font-medium">{errorMessage}</p>
                        <p className="text-slate-500 text-xs mt-1">Don't worry, you can still present your project using the Simulation Mode.</p>
                    </div>
                </div>
                <button 
                    onClick={runDemoSimulation}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all border border-slate-600 hover:border-amber-500 hover:text-amber-400 whitespace-nowrap"
                >
                    <PlayCircle size={18} />
                    Run Simulation
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 bg-slate-800/50 p-6 rounded-3xl border border-slate-700 shadow-2xl">
              <ImageUploader label="The Broken Object" description="Photo of failure point" onImageSelected={handleBrokenImage} previewUrl={brokenPreview} />
              <ImageUploader label="The Scrap Pile" description="Photo of available materials" onImageSelected={handleScrapImage} previewUrl={scrapPreview} />
            </div>

            <div className="mt-12 flex flex-col items-center gap-4">
              <button
                onClick={startAnalysis}
                disabled={!brokenImage || !scrapImage}
                className={`group px-12 py-6 rounded-2xl font-bold text-xl transition-all flex items-center gap-3 ${(!brokenImage || !scrapImage) ? 'bg-slate-800 text-slate-500' : 'bg-amber-500 text-slate-900 shadow-2xl hover:scale-105 shadow-amber-500/30'}`}
              >
                <Zap size={24} fill="currentColor" />
                <span>Launch Analysis</span>
              </button>
              
              {!brokenImage && !scrapImage && (
                  <button 
                    onClick={runDemoSimulation}
                    className="flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-colors text-sm font-medium mt-4"
                  >
                    <PlayCircle size={16} />
                    <span>No photos? Simulate Demo Analysis</span>
                  </button>
              )}
            </div>
          </div>
        )}

        {(appState === AppState.READY) && repairGuide && (
           <RepairGuideView 
             guide={repairGuide} 
             onReset={resetApp} 
             onOpenChat={() => setIsChatOpen(true)} 
             isGenerating={false}
           />
        )}
      </main>

      {repairGuide && <ChatDrawer guide={repairGuide} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default App;
