import React from 'react';
import { X } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoModal({ isOpen, onClose }: VideoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6 text-slate-700" />
        </button>
        <div className="p-4 sm:p-8">
          <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
            <video
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              controls
              src="/hero.mp4"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
