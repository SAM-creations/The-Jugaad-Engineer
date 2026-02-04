import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Printer, Scissors, Link, Flame, Droplet, Hammer, Ruler, Shield, Sparkles, Wrench, Presentation } from 'lucide-react';
import { RepairGuide, ActionType } from '../types';
import PptxGenJS from 'pptxgenjs';

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

  const handleExportPPT = () => {
    const pres = new PptxGenJS();
    pres.author = 'The Jugaad Engineer';
    pres.title = guide.title;

    // --- Slide 1: Title ---
    let slide = pres.addSlide();
    slide.background = { color: "111827" }; // slate-900
    slide.addText("The Jugaad Engineer", { x: 0.5, y: 0.3, w: "90%", fontSize: 14, color: "F59E0B", bold: true });
    slide.addText(guide.title, { x: 0.5, y: "40%", w: "90%", fontSize: 36, color: "FFFFFF", bold: true, align: "center" });
    slide.addText(guide.summary, { x: 1, y: "60%", w: "80%", fontSize: 16, color: "94A3B8", align: "center" });

    // --- Slide 2: Analysis ---
    slide = pres.addSlide();
    slide.background = { color: "F8FAFC" }; // slate-50
    slide.addText("Repair Strategy", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "0F172A" });
    
    // Broken Object Section
    slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.2, w: 4.25, h: 4.0, fill: { color: "E2E8F0" } });
    slide.addText("Problem Analysis", { x: 0.7, y: 1.5, fontSize: 16, bold: true, color: "EF4444" });
    slide.addText(guide.brokenObjectAnalysis, { x: 0.7, y: 1.9, w: 3.8, fontSize: 12, color: "334155" });

    // Scrap Section
    slide.addShape(pres.ShapeType.rect, { x: 5.25, y: 1.2, w: 4.25, h: 4.0, fill: { color: "E2E8F0" } });
    slide.addText("Available Resources", { x: 5.45, y: 1.5, fontSize: 16, bold: true, color: "22C55E" });
    slide.addText(guide.scrapPileAnalysis, { x: 5.45, y: 1.9, w: 3.8, fontSize: 12, color: "334155" });

    // --- Steps Slides ---
    steps.forEach((step, index) => {
      slide = pres.addSlide();
      slide.background = { color: "FFFFFF" };
      
      // Header
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.0, fill: { color: "0F172A" } });
      slide.addText(`Step ${index + 1}: ${step.title}`, { x: 0.5, y: 0.25, w: "90%", fontSize: 24, bold: true, color: "FFFFFF" });
      
      // Left Column: Text
      slide.addText(step.description, { x: 0.5, y: 1.5, w: 5, fontSize: 16, color: "334155" });
      
      // Details Box
      const detailY = 4.0;
      slide.addShape(pres.ShapeType.line, { x: 0.5, y: detailY, w: 5, h: 0, line: { color: "CBD5E1", width: 1 } });
      
      slide.addText("Action Type:", { x: 0.5, y: detailY + 0.3, fontSize: 11, bold: true, color: "64748B" });
      slide.addText(step.actionType, { x: 2.0, y: detailY + 0.3, fontSize: 11, color: "0F172A", bold: true });
      
      slide.addText("Material:", { x: 0.5, y: detailY + 0.6, fontSize: 11, bold: true, color: "64748B" });
      slide.addText(step.materialUsed, { x: 2.0, y: detailY + 0.6, fontSize: 11, color: "0F172A" });
      
      slide.addText("Physics:", { x: 0.5, y: detailY + 0.9, fontSize: 11, bold: true, color: "64748B" });
      slide.addText(step.physicsPrinciple, { x: 2.0, y: detailY + 0.9, fontSize: 11, color: "0F172A", italic: true });

      // Right Column: Image or Placeholder
      if (step.generatedImageUrl) {
        slide.addImage({ data: step.generatedImageUrl, x: 5.8, y: 1.5, w: 3.8, h: 3.8 });
      } else {
        slide.addShape(pres.ShapeType.rect, { x: 5.8, y: 1.5, w: 3.8, h: 3.8, fill: { color: "F1F5F9" }, line: { color: "CBD5E1", dashType: "dash" } });
        slide.addText("Schematic Placeholder", { x: 5.8, y: 3.2, w: 3.8, fontSize: 12, color: "94A3B8", align: "center" });
      }
    });

    // --- Outro Slide ---
    slide = pres.addSlide();
    slide.background = { color: "111827" };
    slide.addText("Repair Complete", { x: 0.5, y: 0.5, w: "90%", fontSize: 44, color: "22C55E", bold: true, align: "center" });

    pres.writeFile({ fileName: `Jugaad_Engineer_${new Date().toISOString().split('T')[0]}.pptx` });
  };

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
           
           <div className="relative z-10 flex flex-col items-center w-full h-full">
             {step.generatedImageUrl ? (
               <img src={step.generatedImageUrl} alt={step.title} className="w-full h-full object-cover" />
             ) : (
               <div className="flex flex-col items-center justify-center h-full">
                 <Icon size={180} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" strokeWidth={1} />
                 <div className="mt-8 text-slate-400 font-mono text-sm tracking-[0.5em] uppercase border-t border-slate-500 pt-4">
                    Schematic: {step.actionType}
                 </div>
               </div>
             )}
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
            <button onClick={handleExportPPT} className="p-2 hover:bg-slate-100 rounded-full flex items-center gap-2 text-slate-600">
              <Presentation size={20} /> <span className="hidden sm:inline">Download PPT</span>
            </button>
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
             {s.generatedImageUrl && (
                <div className="mt-8 border-4 border-slate-900">
                  <img src={s.generatedImageUrl} className="w-full max-w-2xl" />
                </div>
             )}
           </div>
        ))}
      </div>
    </div>
  );
};