import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  className?: string; // Content container class
}

export function Modal({ isOpen, onClose, children, title, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in" 
        onClick={onClose} 
      />
      
      {/* Content */}
      <div className={cn(
        "relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-10 fade-in duration-200", 
        className
      )}>
        <div className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
           <div className="flex justify-between items-center mb-6">
                {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
                <button 
                  onClick={onClose}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
             </div>
           {children}
        </div>
      </div>
    </div>
  );
}
