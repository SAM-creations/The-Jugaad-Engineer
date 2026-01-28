import React, { useState } from 'react';
import { RepairGuide } from '../types';
import { Play, Download, Share2, Wrench, AlertTriangle } from 'lucide-react';
import { PresentationMode } from './PresentationMode';

interface RepairGuideViewProps {
  guide: RepairGuide;
  onReset: () => void;
}

export const RepairGuideView: React.FC<RepairGuideViewProps> = ({ guide, onReset }) => {
  const [showPresentation, setShowPresentation] = useState(false);

  if (showPresentation) {
    return <PresentationMode guide={guide} onClose={() => setShowPresentation(false)} />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 animate-fadeIn">
      {/* Header Section */}
      <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 mb-4">
          <Wrench size={16} />
          <span className="font-mono text-sm uppercase tracking-wider">Engineering Solution Ready</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display text-white">{guide.title}</h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">{guide.summary}</p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <button 
            onClick={() => setShowPresentation(true)}
            className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold text-lg transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
          >
            <Play size={20} fill="currentColor" />
            Start Repair Guide
          </button>
          <button 
            onClick={() => setShowPresentation(true)} // In real app, this might just download pdf directly
            className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-all border border-slate-700 hover:border-slate-500"
          >
            <Download size={20} />
            Export PPT / PDF
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
        <h2 className="text-2xl font-bold text-white mb-6 font-display border-l-4 border-amber-500 pl-4">Repair Steps Preview</h2>
        <div className="grid gap-6">
          {guide.steps.map((step, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden flex flex-col md:flex-row border border-slate-700 hover:border-slate-600 transition-colors group">
              <div className="md:w-1/3 h-48 md:h-auto bg-slate-900 relative overflow-hidden">
                {step.generatedImageUrl ? (
                   <img src={step.generatedImageUrl} alt={step.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm p-4 text-center">
                    Visualizing...
                  </div>
                )}
                <div className="absolute top-0 left-0 bg-slate-900/80 px-3 py-1 text-xs font-mono text-white rounded-br-lg">
                  STEP {idx + 1}
                </div>
              </div>
              <div className="p-6 md:w-2/3 flex flex-col justify-center">
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">{step.title}</h3>
                <p className="text-slate-400 mb-4">{step.description}</p>
                <div className="flex gap-4 text-sm">
                  <div className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600">
                    <span className="text-slate-500 mr-2">Use:</span> {step.materialUsed}
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
          Start New Repair Project
        </button>
      </div>
    </div>
  );
};