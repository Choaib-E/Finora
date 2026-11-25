import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0B1120]/65 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} max-h-[92dvh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[#E8EDF3] bg-white shadow-2xl dark:border-slate-700/80 dark:bg-[#111C2E] overflow-hidden animate-page-enter pb-safe`}
        role="dialog"
        aria-modal="true"
      >
        {/* Poignée visuelle mobile */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="flex items-start justify-between border-b border-[#E8EDF3] px-5 py-4 sm:px-6 dark:border-slate-800 shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="fm-icon-btn text-[#64748B] hover:bg-slate-100 hover:text-[#111827] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#F8FAFC]"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
