
import React, { useState, useEffect } from 'react';
import { RepairGuide, ActionType, RepairStep } from '../types';
import { Play, Share2, AlertTriangle, Volume2, Loader2, MessageSquare, Scissors, Link, Flame, Droplet, Hammer, Ruler, Shield, Sparkles, Wrench, Image as ImageIcon } from 'lucide-react';
import { PresentationMode } from './PresentationMode';
import { generateStepAudio, generateRepairImage } from '../services/geminiService';

interface RepairGuideViewProps {
  guide: RepairGuide;
  onReset: () => void;
  onOpenChat: () => void;
  isGenerating?: boolean;
  apiKey: string;
}

// Map action types to Lucide icons
const ActionIconMap: Record<ActionType, React.ElementType> = {
  'CUT': Scissors,
  'TIE': Link,
  'HEAT': Flame,
  'GLUE': Droplet,
  'ASSEMBLE': Hammer,
  'SUPPORT': Shield,
  'MEASURE': Ruler,
  'CLEAN': Sparkles,
  'GENERIC': Wrench
};

// --- Sub-component for individual step visualization ---
const StepVisualizer: React.FC<{ step: RepairStep, index: number, apiKey: string }> = ({ step, index, apiKey }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const Icon = ActionIconMap[step.actionType] || Wrench;

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      // Small delay based on index to stagger requests slightly so we don't hammer the API all at once
      await new Promise(r => setTimeout(r, index * 1000));
      
      if (!isMounted) return;
      
      try {
        const url = await generateRepairImage(step.visualizationPrompt, apiKey);
        if (isMounted && url) {
          setImageUrl(url);
        }
      } catch (e) {
        console.error("Failed to load image for step", index);
      } finally {
        if (isMounted) setLoadingImage(false);
      }
    };

    fetchImage();
    return () => { isMounted = false; };
  }, [step.visualizationPrompt, index, apiKey]);

  return (
    <div className="md:w-1/3 h-64 md:h-auto bg-[#0f172a] relative overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-700 transition-all duration-500">
        
        {/* BACKGROUND LAYER */}
        {!imageUrl && (
          <>
             <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
                backgroundSize: '20px 20px'
             }}></div>
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-50"></div>
          </>
        )}

        {/* CONTENT LAYER */}
        {imageUrl ? (
          <div className="relative w-full h-full group">
            <img src={imageUrl} alt={step.title} className="w-full h-full object-cover animate-fadeIn" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white/80 font-mono">
              AI GENERATED
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center animate-fadeIn">
            <div className="w-24 h-24 rounded-full border-4 border-slate-700 bg-slate-800 flex items-center justify-center mb-2 shadow-2xl relative">
              <Icon size={48} className="text-blue-400" strokeWidth={1.5} />
              
              {/* Loading Indicator */}
              {loadingImage && (
                 <div className="absolute inset-0 rounded-full border-4 border-amber-500/50 border-t-transparent animate-spin"></div>
              )}
            </div>
            <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
               {loadingImage ? (
                 <>
                   <Loader2 size={10} className="animate-spin" /> Generating Visual...
                 </>
               ) : (
                 <>Action: {step.actionType}</>
               )}
            </div>
          </div>
        )}

        <div className="absolute top-0 left-0 bg-amber-500 text-slate-900 px-3 py-1 text-sm font-bold font-mono rounded-br-lg z-20 shadow-lg">
          STEP {index + 1}
        </div>
    </div>
  );
};

export const RepairGuideView: React.FC<RepairGuideViewProps> = ({ guide, onReset, onOpenChat, apiKey }) => {
  const [showPresentation, setShowPresentation] = useState(false);
  const [loadingAudioStep, setLoadingAudioStep] = useState<number | null>(null);
  const [playingAudioStep, setPlayingAudioStep] = useState<number | null>(null);

  const playAudio = async (text: string, index: number) => {
    if (playingAudioStep === index) return; 
    
    try {
      setLoadingAudioStep(index);
      const audioBuffer = await generateStepAudio(text, apiKey);
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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 mb-4">
          <ImageIcon size={16} />
          <span className="font-mono text-sm uppercase tracking-wider">
            Visual Guide Ready
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
            Start Repair
          </button>
          <button 
            onClick={onOpenChat}
            className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all border border-slate-700 hover:border-amber-500/50 hover:text-amber-400"
          >
            <MessageSquare size={20} />
            Ask Engineer
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

      {/* Steps */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white mb-6 font-display border-l-4 border-amber-500 pl-4">Repair Instructions</h2>
        <div className="grid gap-6">
          {guide.steps.map((step, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden flex flex-col md:flex-row border border-slate-700 hover:border-slate-600 transition-colors group shadow-lg">
              
              {/* Visualizer Component (Handles its own image loading) */}
              <StepVisualizer step={step} index={idx} apiKey={apiKey} />

              {/* Text Content */}
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
                <p className="text-slate-300 mb-6 text-lg leading-relaxed">{step.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                     <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Tools & Materials</span>
                     <span className="text-slate-300 text-sm">{step.materialUsed}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                     <span className="text-xs text-amber-500/70 uppercase font-bold block mb-1">Why this works</span>
                     <span className="text-amber-100/80 text-sm italic">{step.physicsPrinciple}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <button 
          onClick={onReset}
          className="text-slate-500 hover:text-white transition-colors underline decoration-slate-700 underline-offset-4"
        >
          Analyze Another Project
        </button>
      </div>
    </div>
  );
};
