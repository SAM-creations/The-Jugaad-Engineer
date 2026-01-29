import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { ChatDrawer } from './components/ChatDrawer';
import { analyzeRepairScenario, generateRepairImage, fileToGenerativePart } from './services/geminiService';
import { AppState, RepairGuide } from './types';
import { Wrench, Zap, AlertCircle, MessageSquare, KeyRound } from 'lucide-react';

const App: React.FC = () => {
  // --- SAFETY CHECK: Ensure Developer Key is Present ---
  if (!process.env.API_KEY) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 p-8 font-sans">
        <div className="max-w-md text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
             <KeyRound size={40} className="text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-white font-display">Setup Required</h1>
          <div className="bg-slate-800 p-6 rounded-xl text-left space-y-4 border border-slate-700">
            <p className="text-slate-300">The application is missing the <code>API_KEY</code> environment variable.</p>
            <p className="text-sm text-slate-500">
              To make this app public (No Login Required), add your Gemini API Key to your Vercel Project Settings or local <code>.env</code> file.
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-green-400 overflow-x-auto">
              API_KEY=AIzaSy...
            </div>
          </div>
        </div>
      </div>
    );
  }

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
    setIsChatOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 selection:bg-amber-500/30 overflow-x-hidden">
      
      {appState === AppState.ANALYZING && <AnalysisLoading />}

      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Wrench size={18} className="text-slate-900" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden md:block">The Jugaad Engineer</span>
            <span className="font-display font-bold text-xl tracking-tight md:hidden">Jugaad Eng.</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-xs font-mono text-slate-500 hidden sm:block">
               HACKATHON 2026 • GEMINI 3 POWERED
             </div>
             {repairGuide && (
               <button 
                 onClick={() => setIsChatOpen(true)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-amber-500/10 hover:text-amber-400 border border-slate-700 rounded-full transition-colors text-sm"
               >
                 <MessageSquare size={14} />
                 <span>Ask Engineer</span>
               </button>
             )}
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
           <RepairGuideView 
             guide={repairGuide} 
             onReset={resetApp} 
             onOpenChat={() => setIsChatOpen(true)}
            />
        )}
      </main>

      {/* Floating Action Button for Chat - Always Accessible when guide is present */}
      {repairGuide && !isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full shadow-2xl shadow-amber-500/20 z-50 transition-all hover:scale-110 flex items-center gap-3 font-bold animate-fadeIn group"
        >
          <MessageSquare size={24} className="group-hover:animate-pulse" />
          <span className="hidden md:inline pr-1">Ask Engineer</span>
        </button>
      )}

      {/* Chat Drawer */}
      {repairGuide && (
        <ChatDrawer 
          guide={repairGuide} 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}

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