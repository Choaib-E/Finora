import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E8EDF3] bg-white/80 px-6 py-12 text-center dark:border-slate-700/80 dark:bg-[#111C2E]/70">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F7FA] text-[#64748B] dark:bg-[#18243A] dark:text-[#94A3B8]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">{description}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="mt-5 fm-btn-primary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button onClick={onAction} className="mt-5 fm-btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
