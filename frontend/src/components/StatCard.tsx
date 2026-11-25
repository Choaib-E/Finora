import React from 'react';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'income' | 'expense' | 'warning' | 'primary';
  evolutionPct?: number | null;
  evolutionLabel?: string;
  invertEvolutionColor?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'neutral',
  evolutionPct,
  evolutionLabel,
  invertEvolutionColor = false,
}) => {
  const iconTone: Record<NonNullable<StatCardProps['tone']>, string> = {
    neutral: 'bg-slate-100 text-[#64748B] dark:bg-[#18243A] dark:text-[#94A3B8]',
    primary: 'bg-[#315CF5]/10 text-[#315CF5] dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]',
    income: 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]',
    expense: 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]',
    warning: 'bg-[#F59E0B]/10 text-[#F59E0B] dark:bg-[#F59E0B]/15 dark:text-[#F59E0B]',
  };

  const valueTone: Record<NonNullable<StatCardProps['tone']>, string> = {
    neutral: 'text-[#111827] dark:text-[#F8FAFC]',
    primary: 'text-[#111827] dark:text-[#F8FAFC]',
    income: 'text-[#059669] dark:text-[#34D399]',
    expense: 'text-[#E5484D] dark:text-[#FB7185]',
    warning: 'text-[#F59E0B]',
  };

  const renderEvolution = () => {
    if (evolutionPct === undefined) return null;
    if (evolutionPct === null) {
      return (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-[#64748B] dark:bg-[#18243A] dark:text-[#94A3B8]">
          Nouvelle activité
        </span>
      );
    }
    const isUp = evolutionPct >= 0;
    const isPositiveSemantic = invertEvolutionColor ? !isUp : isUp;
    const badgeColor = isPositiveSemantic
      ? 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]'
      : 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]';

    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {isUp ? '+' : ''}
        {evolutionPct.toFixed(1)} %
        {evolutionLabel ? <span className="ml-0.5 font-normal opacity-80">{evolutionLabel}</span> : null}
      </span>
    );
  };

  return (
    <div className="fm-card-hover p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
          {title}
        </span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className={`mt-3 text-2xl font-bold tracking-tight tabular-nums ${valueTone[tone]}`}>
        {value}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        {subtitle && <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">{subtitle}</p>}
        {renderEvolution()}
      </div>
    </div>
  );
};
