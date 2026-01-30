
import React, { useEffect, useState } from 'react';
import { BrainCircuit, Hammer, Search, Lightbulb } from 'lucide-react';

const STEPS = [
  { icon: Search, text: "Rapid scan of materials..." },
  { icon: BrainCircuit, text: "Calculating quick fix..." },
  { icon: Hammer, text: "Finalizing blueprint..." },
  { icon: Lightbulb, text: "Readying solution..." },
];

export const AnalysisLoading: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Fast cycle for the "under 15s" feel
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
      <div className="w-full max-w-md">
        <div className="relative mb-12 flex justify-center">
          <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full animate-pulse"></div>
          <BrainCircuit size={80} className="text-amber-400 animate-bounce relative z-10" />
        </div>
        
        <h2 className="text-3xl font-bold font-display text-white mb-8">Engineering Solution...</h2>
        
        <div className="space-y-6 text-left pl-8 border-l-2 border-slate-700">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-4 transition-all duration-300 ${isActive ? 'translate-x-2 text-white scale-105' : 'text-slate-500 opacity-30'}`}
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
            animation: progress 2s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
};
