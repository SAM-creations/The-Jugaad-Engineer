
import React, { useState } from 'react';
import { RepairGuide } from '../types';
import { Play, Share2, Wrench, AlertTriangle, Volume2, Loader2, MessageSquare } from 'lucide-react';
import { PresentationMode } from './PresentationMode';
import { generateStepAudio } from '../services/geminiService';

interface RepairGuideViewProps {
  guide: RepairGuide;
  onReset: () => void;
  onOpenChat: () => void;
  isGenerating?: boolean;
}

export const RepairGuideView: React.FC<RepairGuideViewProps> = ({ guide, onReset, onOpenChat, isGenerating }) => {
  const [showPresentation, setShowPresentation] = useState(false);
  const [loadingAudioStep, setLoadingAudioStep] = useState<number | null>(null);
  const [playingAudioStep, setPlayingAudioStep] = useState<number | null>(null);

  const playAudio = async (text: string, index: number) => {
    if (playingAudioStep === index) return; 
    
    try {
      setLoadingAudioStep(index);
      const audioBuffer = await generateStepAudio(text);
      setLoadingAudioStep(null);
      setPlayingAudioStep(index);

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => setPlayingAudioStep(null);
      source.start();
    } catch (e) {
      console.error(e);
      setLoadingAudioStep(null);
      setPlayingAudioStep(null);
    }
  };

  if (showPresentation) {
    return <PresentationMode guide={guide} onClose={() => setShowPresentation(false)} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 animate-fadeIn">
      {/* Header Section */}
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 mb-4">
          <Wrench size={16} />
          <span className="font-mono text-sm uppercase tracking-wider">
            {isGenerating ? "Visualizing Solutions..." : "Engineering Guide Ready"}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display text-white">{guide.title}</h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">{guide.summary}</p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <button 
            onClick={() => setShowPresentation(true)}
            className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
          >
            <Play size={20} fill="currentColor" />
            Interactive Guide
          </button>
          <button 
            onClick={onOpenChat}
            className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all border border-slate-700 hover:border-amber-500/50 hover:text-amber-400"
          >
            <MessageSquare size={20} />
            Ask the Engineer
          </button>
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" /> Damage Assessment
          </h3>
          <p className="text-slate-200 leading-relaxed">{guide.brokenObjectAnalysis}</p>
        </div>
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
          <h3 className="text-slate-400 uppercase text-xs font-bold tracking-widest mb-3 flex items-center gap-2">
            <Share2 size={14} className="text-green-400" /> Resource Inventory
          </h3>
          <p className="text-slate-200 leading-relaxed">{guide.scrapPileAnalysis}</p>
        </div>
      </div>

      {/* Quick Step Preview */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white mb-6 font-display border-l-4 border-amber-500 pl-4">Repair Steps</h2>
        <div className="grid gap-6">
          {guide.steps.map((step, idx) => {
            const isThisStepLoading = isGenerating && !step.generatedImageUrl;
            
            return (
              <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden flex flex-col md:flex-row border border-slate-700 hover:border-slate-600 transition-colors group">
                <div className="md:w-1/3 h-64 md:h-auto bg-slate-900 relative overflow-hidden flex items-center justify-center">
                  {step.generatedImageUrl ? (
                     <img src={step.generatedImageUrl} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full relative">
                      <div className="absolute inset-0 bg-[#0f172a]" style={{
                        backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }}></div>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-4 text-center z-10">
                         <div className="w-16 h-16 border-2 border-slate-700 rounded-lg flex items-center justify-center mb-3 bg-slate-800/50 backdrop-blur-sm">
                           {isThisStepLoading ? (
                             <Loader2 size={32} className="animate-spin text-amber-500" />
                           ) : (
                             <Wrench size={32} className="text-slate-700" />
                           )}
                         </div>
                         <p className="text-xs font-mono uppercase tracking-widest text-amber-500/70">
                           {isThisStepLoading ? "Visualizing Joint..." : "Schematic Offline"}
                         </p>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-0 left-0 bg-slate-900/90 px-3 py-1 text-xs font-mono text-white rounded-br-lg z-20 border-r border-b border-slate-700">
                    STEP {idx + 1}
                  </div>
                </div>
                <div className="p-6 md:w-2/3 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">{step.title}</h3>
                     <button 
                      onClick={() => playAudio(step.description, idx)}
                      disabled={loadingAudioStep === idx || playingAudioStep === idx}
                      className={`p-2 rounded-full transition-all ${
                        playingAudioStep === idx 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                     >
                       {loadingAudioStep === idx ? <Loader2 size={18} className="animate-spin" /> : <Volume2 size={18} className={playingAudioStep === idx ? "animate-pulse" : ""} />}
                     </button>
                  </div>
                  <p className="text-slate-400 mb-4">{step.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600">
                      <span className="text-slate-500 mr-2">Use:</span> {step.materialUsed}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <span className="text-amber-600/50 mr-2">Logic:</span> {step.physicsPrinciple}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-16 text-center">
        <button 
          onClick={onReset}
          className="text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
        >
          New Project Analysis
        </button>
      </div>
    </div>
  );
};
