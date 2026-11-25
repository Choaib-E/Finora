import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Download, FileText, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage, reportsApi } from '../services/api';
import type { ReportSummary } from '../types';

type PeriodPreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

function getPresetDates(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'week') {
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    return { from: toIso(monday), to: toIso(now) };
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIso(start), to: toIso(now) };
  }
  if (preset === 'quarter') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: toIso(start), to: toIso(now) };
  }
  if (preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { from: toIso(start), to: toIso(now) };
  }
  return { from: '', to: '' };
}

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatAmount } = usePreferences();
  const { theme } = useTheme();

  const [preset, setPreset] = useState<PeriodPreset>('year');
  const [dateFrom, setDateFrom] = useState(() => getPresetDates('year').from);
  const [dateTo, setDateTo] = useState(() => getPresetDates('year').to);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportsApi.summary({ date_from: dateFrom, date_to: dateTo });
      setSummary(data);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors du chargement des rapports.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, showToast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const applyPreset = (nextPreset: PeriodPreset) => {
    setPreset(nextPreset);
    if (nextPreset !== 'custom') {
      const range = getPresetDates(nextPreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    setExporting('csv');
    try {
      const blob = await reportsApi.exportCsv({ date_from: dateFrom, date_to: dateTo });
      triggerDownload(blob, 'finora_rapport.csv');
      showToast('Export CSV téléchargé.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erreur lors de l'export CSV."), 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    try {
      const blob = await reportsApi.exportPdf({ date_from: dateFrom, date_to: dateTo });
      triggerDownload(blob, 'finora_rapport.pdf');
      showToast('Rapport PDF téléchargé.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erreur lors de l'export PDF."), 'error');
    } finally {
      setExporting(null);
    }
  };

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#1E293B' : '#E8EDF3';
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#111C2E' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E8EDF3',
    borderRadius: '12px',
    fontSize: '12px',
    color: isDark ? '#F8FAFC' : '#111827',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Rapports et statistiques
          </h1>
          <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Analysez vos tendances sur mesure et exportez vos bilans en CSV ou PDF
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            disabled={exporting !== null}
            className="fm-btn-secondary w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            <span>{exporting === 'csv' ? 'Export...' : 'Exporter CSV'}</span>
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="fm-btn-primary w-full sm:w-auto"
          >
            <FileText className="h-4 w-4" />
            <span>{exporting === 'pdf' ? 'Génération...' : 'Exporter PDF'}</span>
          </button>
        </div>
      </div>

      {/* Filtres rapides + période personnalisée */}
      <div className="fm-card p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'week', label: 'Cette semaine' },
            { key: 'month', label: 'Ce mois' },
            { key: 'quarter', label: 'Les trois derniers mois' },
            { key: 'year', label: 'Cette année' },
            { key: 'custom', label: 'Période personnalisée' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => applyPreset(item.key as PeriodPreset)}
              className={`min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === item.key
                  ? 'bg-[#315CF5] text-white dark:bg-[#6D8AFF] dark:text-[#0B1120]'
                  : 'bg-[#F5F7FA] text-[#64748B] hover:text-[#111827] dark:bg-[#18243A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPreset('custom');
              setDateFrom(e.target.value);
            }}
            className="fm-input sm:w-auto py-1.5 text-sm sm:text-xs"
            aria-label="Date de début"
          />
          <span className="hidden sm:inline text-xs text-[#64748B] dark:text-[#94A3B8]">au</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPreset('custom');
              setDateTo(e.target.value);
            }}
            className="fm-input sm:w-auto py-1.5 text-sm sm:text-xs"
            aria-label="Date de fin"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setPreset('custom');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs font-medium text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
            >
              Tout l'historique
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="fm-card h-72 animate-pulse" />
      ) : !summary || summary.nombre_transactions === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Aucune donnée sur cette période"
          description="Ajoutez des transactions ou sélectionnez une plage de dates plus large pour générer vos statistiques."
          actionLabel="Ajouter une transaction"
          actionTo="/transactions/nouvelle"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Revenus sur la période"
              value={formatAmount(summary.total_revenus)}
              subtitle={`${summary.nombre_transactions} transaction(s)`}
              icon={TrendingUp}
              tone="income"
            />
            <StatCard
              title="Dépenses sur la période"
              value={formatAmount(summary.total_depenses)}
              subtitle="Sorties cumulées"
              icon={TrendingDown}
              tone="expense"
            />
            <StatCard
              title="Épargne nette"
              value={formatAmount(summary.epargne_nette)}
              subtitle={`Taux d'épargne : ${summary.taux_epargne.toFixed(1)} %`}
              icon={PiggyBank}
              tone={summary.epargne_nette >= 0 ? 'income' : 'warning'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Comparaison mensuelle */}
            <div className="fm-card p-6">
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] mb-4">
                Comparaison mensuelle (Revenus vs Dépenses)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.comparaison_mensuelle}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="mois_label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatAmount(v)} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="revenus" name="Revenus" fill={isDark ? '#34D399' : '#059669'} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="depenses" name="Dépenses" fill={isDark ? '#FB7185' : '#E5484D'} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Évolution du solde */}
            <div className="fm-card p-6">
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] mb-4">
                Évolution du solde sur la période
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.evolution_solde}>
                    <defs>
                      <linearGradient id="reportSoldeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#6D8AFF' : '#315CF5'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isDark ? '#6D8AFF' : '#315CF5'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatAmount(v)} />
                    <Area
                      type="monotone"
                      dataKey="solde"
                      name="Solde cumulé"
                      stroke={isDark ? '#6D8AFF' : '#315CF5'}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#reportSoldeGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Évolution de l'épargne */}
            <div className="fm-card p-6">
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] mb-4">
                Évolution de l'épargne mensuelle
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.comparaison_mensuelle}>
                    <defs>
                      <linearGradient id="reportEpargneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isDark ? '#34D399' : '#059669'} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={isDark ? '#34D399' : '#059669'} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="mois_label" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatAmount(v)} />
                    <Area
                      type="monotone"
                      dataKey="epargne"
                      name="Épargne"
                      stroke={isDark ? '#34D399' : '#059669'}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#reportEpargneGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Répartition par catégorie */}
            <div className="fm-card p-6">
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC] mb-4">
                Répartition des dépenses par catégorie
              </h3>
              {summary.depenses_par_categorie.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-sm text-[#64748B]">
                  Aucune dépense sur cette période.
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.depenses_par_categorie}
                        dataKey="montant"
                        nameKey="categorie"
                        cx="50%"
                        cy="46%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {summary.depenses_par_categorie.map((entry) => (
                          <Cell key={entry.categorie} fill={entry.couleur} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatAmount(v)} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Catégories les plus coûteuses */}
          <div className="fm-card overflow-hidden">
            <div className="border-b border-[#E8EDF3] px-6 py-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Catégories les plus coûteuses
              </h3>
            </div>
            <div className="divide-y divide-[#E8EDF3] dark:divide-slate-800">
              {summary.depenses_par_categorie.map((item, idx) => (
                <div key={item.categorie} className="flex items-center gap-4 px-6 py-3.5">
                  <span className="w-6 text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.couleur }} />
                        {item.categorie}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatAmount(item.montant)}{' '}
                        <span className="text-[#64748B] dark:text-[#94A3B8] font-normal">
                          ({item.pourcentage.toFixed(1)} %)
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F7FA] dark:bg-[#18243A]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, item.pourcentage)}%`, backgroundColor: item.couleur }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
