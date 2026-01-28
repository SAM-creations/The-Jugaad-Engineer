import React, { useEffect, useState } from 'react';
import { BrainCircuit, Hammer, Search, Lightbulb } from 'lucide-react';

const STEPS = [
  { icon: Search, text: "Scanning scrap pile for materials..." },
  { icon: BrainCircuit, text: "Identifying failure points..." },
  { icon: Hammer, text: "Simulating physics repairs..." },
  { icon: Lightbulb, text: "Generating repair visualizations..." },
];

export const AnalysisLoading: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Speed up the animation loop to match the faster API response time
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
      <div className="w-full max-w-md">
        <div className="relative mb-12 flex justify-center">
          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
          <BrainCircuit size={80} className="text-amber-400 animate-bounce relative z-10" />
        </div>
        
        <h2 className="text-3xl font-bold font-display text-white mb-8">The Jugaad Engineer is Thinking</h2>
        
        <div className="space-y-6 text-left pl-8 border-l-2 border-slate-700">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isPast = idx < currentStep; // Actually we loop, so just highlight active
            
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'translate-x-2 text-white scale-105' : 'text-slate-500 opacity-50'}`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800'}`}>
                  <Icon size={24} />
                </div>
                <span className="text-lg font-medium">{step.text}</span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-12 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 animate-progress origin-left w-full"></div>
        </div>
        <style>{`
          @keyframes progress {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
          }
          .animate-progress {
            animation: progress 3s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};