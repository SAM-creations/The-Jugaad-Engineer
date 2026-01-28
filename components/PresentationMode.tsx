import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Printer, Download } from 'lucide-react';
import { RepairGuide } from '../types';

interface PresentationModeProps {
  guide: RepairGuide;
  onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ guide, onClose }) => {
  const [slideIndex, setSlideIndex] = useState(0);

  // Combine title slide + steps into one array of content
  const totalSlides = 1 + guide.steps.length + 1; // Intro + steps + Outro

  const nextSlide = () => setSlideIndex(prev => Math.min(prev + 1, totalSlides - 1));
  const prevSlide = () => setSlideIndex(prev => Math.max(prev - 1, 0));

  const handlePrint = () => {
    window.print();
  };

  const renderSlideContent = () => {
    // Slide 0: Title Slide
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
              <h3 className="text-slate-400 uppercase text-sm font-bold mb-2">Available Resources</h3>
              <p className="text-slate-800 text-lg font-medium">{guide.scrapPileAnalysis}</p>
            </div>
          </div>
          <div className="absolute bottom-12 text-slate-400 uppercase tracking-widest text-sm">
            Powered by The Jugaad Engineer
          </div>
        </div>
      );
    }

    // Last Slide: Outro
    if (slideIndex === totalSlides - 1) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-fadeIn">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6">
             <span className="text-4xl">✓</span>
           </div>
           <h2 className="text-5xl font-bold text-slate-900">Repair Complete</h2>
           <p className="text-xl text-slate-600">You have successfully engineered a solution.</p>
        </div>
       )
    }

    // Steps Slides
    const step = guide.steps[slideIndex - 1];
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
               <span className="text-amber-600 font-bold uppercase text-sm">Material:</span>
               <span className="text-slate-800 font-medium">{step.materialUsed}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="text-amber-600 font-bold uppercase text-sm">Physics:</span>
               <span className="text-slate-800 font-medium">{step.physicsPrinciple}</span>
             </div>
          </div>
        </div>
        <div className="order-1 lg:order-2 h-[400px] lg:h-[600px] w-full bg-slate-200 rounded-3xl overflow-hidden shadow-2xl relative">
          {step.generatedImageUrl ? (
            <img src={step.generatedImageUrl} alt={step.title} className="w-full h-full object-cover" />
          ) : (
             <div className="flex items-center justify-center h-full text-slate-400">Visualization Loading...</div>
          )}
           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-6">
             <p className="text-white/80 text-sm italic font-light">AI Visualization of Repair Step</p>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 overflow-hidden flex flex-col">
      {/* Controls Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100 no-print">
         <div className="font-bold text-lg tracking-tight">The Jugaad Engineer</div>
         <div className="flex items-center gap-2">
            <span className="mr-4 text-sm text-slate-400">Slide {slideIndex + 1} of {totalSlides}</span>
            <button onClick={handlePrint} className="p-2 hover:bg-slate-100 rounded-full flex items-center gap-2 text-slate-600">
              <Printer size={20} /> <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full text-slate-600 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
         </div>
      </div>

      {/* Main Slide Area */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
           {renderSlideContent()}
        </div>

        {/* Navigation Buttons (No Print) */}
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

      {/* Print-specific hidden container to dump all slides for PDF export */}
      <div className="hidden print-only">
        {/* Slide 1: Title */}
        <div className="slide-page bg-white">
           <h1 className="text-6xl font-bold mb-8">{guide.title}</h1>
           <p className="text-2xl text-gray-600 mb-12">{guide.summary}</p>
           <div className="border p-8 mb-8">
             <h3 className="font-bold text-gray-400 uppercase">Problem</h3>
             <p className="text-xl">{guide.brokenObjectAnalysis}</p>
           </div>
           <div className="border p-8">
             <h3 className="font-bold text-gray-400 uppercase">Resources</h3>
             <p className="text-xl">{guide.scrapPileAnalysis}</p>
           </div>
        </div>
        {/* Steps */}
        {guide.steps.map((s, i) => (
           <div key={i} className="slide-page bg-white">
             <div className="flex justify-between items-start mb-8">
               <h2 className="text-4xl font-bold">Step {i + 1}: {s.title}</h2>
             </div>
             <div className="flex flex-col gap-8">
               {s.generatedImageUrl && (
                 <img src={s.generatedImageUrl} className="w-full h-[50vh] object-cover rounded-xl border border-gray-200" style={{objectPosition: 'center'}} />
               )}
               <p className="text-2xl leading-relaxed">{s.description}</p>
               <div className="grid grid-cols-2 gap-4 mt-8 bg-gray-50 p-6 rounded-lg">
                  <div><strong>Material:</strong> {s.materialUsed}</div>
                  <div><strong>Physics:</strong> {s.physicsPrinciple}</div>
               </div>
             </div>
           </div>
        ))}
      </div>
    </div>
  );
};
