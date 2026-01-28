import React, { useRef, useState } from 'react';
import { Upload, X, Check, Camera } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  description: string;
  onImageSelected: (file: File | null) => void;
  previewUrl: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  description, 
  onImageSelected, 
  previewUrl 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{label}</label>
      <div
        className={`relative group border-2 border-dashed rounded-xl transition-all duration-300 h-64 flex flex-col items-center justify-center cursor-pointer overflow-hidden
          ${isDragging ? 'border-amber-400 bg-amber-400/10' : 'border-slate-600 bg-slate-800/50 hover:border-slate-400 hover:bg-slate-800'}
          ${previewUrl ? 'border-solid border-slate-600' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !previewUrl && inputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onImageSelected(null);
              }}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/80 rounded-full text-white transition-colors backdrop-blur-sm"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/60 rounded-full text-xs text-white backdrop-blur-sm flex items-center gap-1">
              <Check size={12} className="text-green-400" /> Image captured
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center p-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera size={32} className="text-slate-400 group-hover:text-amber-400 transition-colors" />
            </div>
            <div>
              <p className="font-medium text-slate-200">Click or Drag & Drop</p>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};