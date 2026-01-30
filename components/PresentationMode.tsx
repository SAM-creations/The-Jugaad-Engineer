
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Printer, Scissors, Link, Flame, Droplet, Hammer, Ruler, Shield, Sparkles, Wrench } from 'lucide-react';
import { RepairGuide, ActionType } from '../types';

interface PresentationModeProps {
  guide: RepairGuide;
  onClose: () => void;
}

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

export const PresentationMode: React.FC<PresentationModeProps> = ({ guide, onClose }) => {
  const steps = guide.steps || [];
  const [slideIndex, setSlideIndex] = useState(0);
  const totalSlides = 1 + steps.length + 1; 

  const nextSlide = () => setSlideIndex(prev => Math.min(prev + 1, totalSlides - 1));
  const prevSlide = () => setSlideIndex(prev => Math.max(prev - 1, 0));
  const handlePrint = () => window.print();

  const renderSlideContent = () => {
    // Title Slide
    if (slideIndex === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fadeIn">
          <div className="w-32 h-1 bg-amber-500"></div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 leading-tight">
            {guide.title}
          </h1>
          <p className="text-2xl text-slate-600 max-w-3xl leading-relaxed">
            {guide.summary}
          </p>
          <div className="grid grid-cols-2 gap-8 mt-12 w-full max-w-4xl text-left bg-slate-100 p-8 rounded-2xl">
            <div>
              <h3 className="text-slate-400 uppercase text-sm font-bold mb-2">Problem</h3>
              <p className="text-slate-800 text-lg font-medium">{guide.brokenObjectAnalysis}</p>
            </div>
            <div>
              <h3 className="text-slate-400 uppercase text-sm font-bold mb-2">Resources</h3>
              <p className="text-slate-800 text-lg font-medium">{guide.scrapPileAnalysis}</p>
            </div>
          </div>
        </div>
      );
    }

    // Outro Slide
    if (slideIndex === totalSlides - 1) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fadeIn">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 text-white shadow-xl">
             <span className="text-4xl">✓</span>
           </div>
           <h2 className="text-5xl font-bold text-slate-900">Repair Complete</h2>
           <p className="text-xl text-slate-600">Engineering solution verified.</p>
        </div>
       )
    }

    // Step Slide
    const step = steps[slideIndex - 1];
    if (!step) return null; // Safety

    const Icon = ActionIconMap[step.actionType] || Wrench;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 h-full items-center animate-fadeIn p-8">
        <div className="order-2 lg:order-1 space-y-8">
          <div className="flex items-center gap-4">
             <span className="bg-slate-900 text-white w-12 h-12 flex items-center justify-center rounded-full text-xl font-bold">
               {slideIndex}
             </span>
             <h2 className="text-4xl font-bold text-slate-900">{step.title}</h2>
          </div>
          <p className="text-2xl text-slate-700 leading-relaxed">
            {step.description}
          </p>
          <div className="space-y-4 pt-6 border-t border-slate-200">
             <div className="flex items-center gap-3">
               <span className="text-amber-600 font-bold uppercase text-sm">Action Type:</span>
               <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">{step.actionType}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-amber-600 font-bold uppercase text-sm">Material:</span>
               <span className="text-slate-800 font-medium">{step.materialUsed}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-amber-600 font-bold uppercase text-sm">Physics:</span>
               <span className="text-slate-800 font-medium">{step.physicsPrinciple}</span>
             </div>
          </div>
        </div>
        
        {/* Blueprint Visualizer */}
        <div className="order-1 lg:order-2 h-[400px] lg:h-[600px] w-full bg-[#1e293b] rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center">
           {/* Grid Pattern */}
           <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
              backgroundSize: '40px 40px'
           }}></div>
           
           <div className="relative z-10 flex flex-col items-center">
             <Icon size={180} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" strokeWidth={1} />
             <div className="mt-8 text-slate-400 font-mono text-sm tracking-[0.5em] uppercase border-t border-slate-500 pt-4">
                Schematic: {step.actionType}
             </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 no-print">
         <div className="font-bold text-lg tracking-tight">The Jugaad Engineer</div>
         <div className="flex items-center gap-2">
            <span className="mr-4 text-sm text-slate-400">Step {slideIndex} of {totalSlides - 1}</span>
            <button onClick={handlePrint} className="p-2 hover:bg-slate-100 rounded-full flex items-center gap-2 text-slate-600">
              <Printer size={20} /> <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full text-slate-600 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
           {renderSlideContent()}
        </div>

        <button 
          onClick={prevSlide} 
          disabled={slideIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/80 shadow-lg hover:bg-white disabled:opacity-30 transition-all text-slate-900 no-print"
        >
          <ChevronLeft size={32} />
        </button>
        <button 
          onClick={nextSlide} 
          disabled={slideIndex === totalSlides - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-full bg-white/80 shadow-lg hover:bg-white disabled:opacity-30 transition-all text-slate-900 no-print"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Hidden Print Content */}
      <div className="hidden print-only">
        <div className="slide-page bg-white">
           <h1 className="text-6xl font-bold mb-8">{guide.title}</h1>
           <p className="text-2xl text-gray-600 mb-12">{guide.summary}</p>
        </div>
        {(steps || []).map((s, i) => (
           <div key={i} className="slide-page bg-white">
             <h2 className="text-4xl font-bold mb-4">Step {i + 1}: {s.title} ({s.actionType})</h2>
             <p className="text-2xl leading-relaxed mb-8">{s.description}</p>
           </div>
        ))}
      </div>
    </div>
  );
};
