
import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisLoading } from './components/AnalysisLoading';
import { RepairGuideView } from './components/RepairGuideView';
import { ChatDrawer } from './components/ChatDrawer';
import { analyzeRepairScenario } from './services/geminiService';
import { DEMO_GUIDE } from './services/demoService';
import { AppState, RepairGuide } from './types';
import { Wrench, Zap, AlertCircle, MessageSquare, PlayCircle, KeyRound, X, Check, Save, RefreshCw, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [brokenImage, setBrokenImage] = useState<File | null>(null);
  const [scrapImage, setScrapImage] = useState<File | null>(null);
  const [brokenPreview, setBrokenPreview] = useState<string | null>(null);
  const [scrapPreview, setScrapPreview] = useState<string | null>(null);
  const [repairGuide, setRepairGuide] = useState<RepairGuide | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Custom API Key State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [tempKeyInput, setTempKeyInput] = useState('');

  // Load key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('jugaad_user_api_key');
    if (storedKey) {
      setUserApiKey(storedKey);
      setTempKeyInput(storedKey);
    }
  }, []);

  const handleSaveKey = () => {
    // Save to local storage and update state WITHOUT reloading
    localStorage.setItem('jugaad_user_api_key', tempKeyInput);
    setUserApiKey(tempKeyInput);
    setShowKeyModal(false);
    setErrorMessage(null);
  };

  const handleClearKey = () => {
    localStorage.removeItem('jugaad_user_api_key');
    setUserApiKey('');
    setTempKeyInput('');
    setShowKeyModal(false);
  };

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

  const getEffectiveKey = () => {
    // Priority: 1. User Custom Key, 2. Hardcoded Key
    if (userApiKey && userApiKey.length > 10) return userApiKey;
    
    // HARDCODED KEY FOR HACKATHON SUBMISSION
    // This bypasses Vercel env variable issues
    return "AIzaSyBErOAfdk2UQ-NIcrrCaO3c1x3pADGzfPg";
  };

  const startAnalysis = async () => {
    if (!brokenImage || !scrapImage) return;

    const key = getEffectiveKey();
    
    // Check if key looks valid
    if (!key || key.includes("PASTE_YOUR") || key.length < 10) {
      setAppState(AppState.ERROR);
      setErrorMessage("Please configure your API Key to continue.");
      // Automatically prompt for key if missing
      setShowKeyModal(true);
      return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMessage(null);

    try {
      // Step 1: Brain 1 Analysis (Returns Action Types for Blueprint Mode)
      const guide = await analyzeRepairScenario(brokenImage, scrapImage, key);
      setRepairGuide(guide);
      
      // BLUEPRINT MODE: Skip image generation here. The UI will handle Brain 2 calls in background.
      setAppState(AppState.READY);

    } catch (error: any) {
      console.error("App Error:", error);
      setAppState(AppState.ERROR);
      
      const msg = error.message?.toLowerCase() || '';
      
      if (msg.includes('quota') || msg.includes('429')) {
         setErrorMessage("⚠️ Global Quota Exceeded. Please add your own API Key to continue.");
      } else if (msg.includes('api key') || msg.includes('400') || msg.includes('403') || msg.includes('invalid')) {
         setErrorMessage("API Key Error: The provided key is invalid.");
      } else {
         setErrorMessage(error.message || "Network issue detected.");
      }
    }
  };

  const runDemoSimulation = async () => {
    setAppState(AppState.ANALYZING);
    setErrorMessage(null);
    setRepairGuide(null);
    
    // Simulate Analysis Time
    await new Promise(resolve => setTimeout(resolve, 2000));

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

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <KeyRound size={24} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Add Your Own Key</h3>
                <p className="text-xs text-slate-400">Enter a Google Gemini API Key</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">API Key</label>
                <input 
                  type="password" 
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:outline-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleSaveKey}
                  disabled={tempKeyInput.length < 10}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                >
                  <Save size={18} />
                  Save Key
                </button>
                {userApiKey && (
                  <button 
                    onClick={handleClearKey}
                    className="px-4 py-3 bg-slate-700 hover:bg-red-500/20 hover:text-red-400 text-slate-300 font-bold rounded-xl transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Key is stored locally in browser. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-500 underline">Get a key here</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Wrench size={18} className="text-slate-900" />
            </div>
            <span className="font-display font-bold text-xl hidden md:block tracking-tight">The Jugaad Engineer</span>
            <span className="font-display font-bold text-xl md:hidden">Jugaad Eng.</span>
          </div>
          <div className="flex items-center gap-3">
             {repairGuide && (
               <button 
                 onClick={() => setIsChatOpen(true)} 
                 className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-full font-bold text-xs hover:bg-slate-700 transition-colors"
               >
                 <MessageSquare size={14} /> 
                 <span>ASK</span>
               </button>
             )}

             {/* Custom Key Button */}
             <button
               onClick={() => setShowKeyModal(true)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-xs border transition-all ${
                 userApiKey 
                   ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                   : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
               }`}
             >
               {userApiKey ? <Check size={14} /> : <KeyRound size={14} />}
               <span className="hidden sm:inline">{userApiKey ? 'My Key' : 'Add Key'}</span>
             </button>

             {/* Demo Button */}
             <button 
              onClick={runDemoSimulation}
              className="flex items-center gap-2 text-xs font-mono font-bold text-amber-500 hover:text-amber-400 transition-colors border border-amber-500/30 hover:border-amber-500 bg-amber-500/10 px-3 py-1.5 rounded"
             >
               <Zap size={12} />
               <span className="hidden sm:inline">DEMO</span>
             </button>
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

            {/* ERROR STATE with prominent Key Config */}
            {appState === AppState.ERROR && (
              <div className="mb-8 bg-slate-800 rounded-2xl border border-red-500/30 overflow-hidden shadow-2xl animate-bounce-subtle">
                 <div className="p-6 bg-red-500/10 flex items-start gap-4">
                    <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                    <div className="flex-1">
                      <h3 className="text-red-400 font-bold text-lg mb-1">Analysis Stopped</h3>
                      <p className="text-slate-300">{errorMessage}</p>
                    </div>
                 </div>
                 
                 <div className="p-6 bg-slate-800 border-t border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-amber-500/20 rounded-lg">
                          <KeyRound size={20} className="text-amber-500" />
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-white text-sm">Custom API Key Required</p>
                          <p className="text-xs text-slate-500">Add your own key to bypass limits.</p>
                       </div>
                    </div>
                    <button 
                       onClick={() => setShowKeyModal(true)}
                       className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-white text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                       Configure Key <ChevronRight size={16} />
                    </button>
                 </div>
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
             apiKey={getEffectiveKey()}
           />
        )}
      </main>

      {repairGuide && <ChatDrawer guide={repairGuide} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} apiKey={getEffectiveKey()} />}
    </div>
  );
};

export default App;
