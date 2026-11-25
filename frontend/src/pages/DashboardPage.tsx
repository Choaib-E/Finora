import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Hash,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '../components/EmptyState';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { dashboardApi, getApiErrorMessage } from '../services/api';
import type { DashboardData } from '../types';
import { formatDateFR, MONTH_NAMES_FR } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { formatAmount } = usePreferences();
  const { showToast } = useToast();

  const now = new Date();
  const [mois, setMois] = useState<number>(now.getMonth() + 1);
  const [annee, setAnnee] = useState<number>(now.getFullYear());
  const [chartWindow, setChartWindow] = useState<'6' | '12' | 'all'>('12');
  const [donutScope, setDonutScope] = useState<'month' | 'global'>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .get({ mois, annee })
      .then(setData)
      .catch((err) => showToast(getApiErrorMessage(err, 'Erreur de chargement du tableau de bord.'), 'error'))
      .finally(() => setLoading(false));
  }, [mois, annee, showToast]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  const monthlySeries = useMemo(() => {
    if (!data) return [];
    const list = data.evolution_mensuelle;
    if (chartWindow === '6') return list.slice(-6);
    if (chartWindow === '12') return list.slice(-12);
    return list;
  }, [data, chartWindow]);

  const donutCategories = useMemo(() => {
    if (!data) return [];
    return donutScope === 'month' ? data.depenses_par_categorie_mois : data.depenses_par_categorie;
  }, [data, donutScope]);

  const top5Categories = useMemo(() => {
    if (!data) return [];
    const source = data.depenses_par_categorie_mois.length > 0
      ? data.depenses_par_categorie_mois
      : data.depenses_par_categorie;
    return source.slice(0, 5);
  }, [data]);

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#1E293B' : '#E8EDF3';
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#111C2E' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E8EDF3',
    borderRadius: '12px',
    fontSize: '12px',
    color: isDark ? '#F8FAFC' : '#111827',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)',
  };

  return (
    <div className="space-y-6">
      {/* En-tête personnalisé */}
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Bienvenue sur Finora, {user?.name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Suivez votre trésorerie, vos budgets et l'évolution de votre épargne pour{' '}
            <span className="font-medium text-[#111827] dark:text-[#F8FAFC]">
              {MONTH_NAMES_FR[mois - 1]} {annee}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
          <div className="flex min-h-[44px] items-center justify-between sm:justify-start gap-2 rounded-xl border border-[#E8EDF3] bg-white px-3 py-2 shadow-card dark:border-slate-700/80 dark:bg-[#111C2E]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <select
                value={mois}
                onChange={(e) => setMois(Number(e.target.value))}
                className="bg-transparent text-sm sm:text-xs font-semibold text-[#111827] focus:outline-none dark:text-[#F8FAFC]"
                aria-label="Mois"
              >
                {MONTH_NAMES_FR.map((label, idx) => (
                  <option key={label} value={idx + 1} className="dark:bg-[#111C2E]">
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value))}
              className="bg-transparent text-sm sm:text-xs font-semibold text-[#111827] focus:outline-none dark:text-[#F8FAFC]"
              aria-label="Année"
            >
              {years.map((y) => (
                <option key={y} value={y} className="dark:bg-[#111C2E]">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Link to="/transactions/nouvelle" className="fm-btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Ajouter une transaction</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fm-card h-32 animate-pulse" />
          ))}
        </div>
      ) : !data || !data.has_data ? (
        <EmptyState
          icon={Wallet}
          title="Votre tableau de bord est prêt"
          description="Ajoutez votre première transaction ou importez un fichier CSV pour visualiser vos soldes, graphiques et budgets."
          actionLabel="Ajouter une transaction"
          actionTo="/transactions/nouvelle"
        />
      ) : (
        <>
          {/* Section 1 : 4 Cartes principales */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
            <StatCard
              title="Solde total"
              value={formatAmount(data.solde_total)}
              subtitle="Cumul global"
              icon={Wallet}
              tone={data.solde_total >= 0 ? 'primary' : 'expense'}
              evolutionPct={data.solde_evolution_pct}
              evolutionLabel="vs mois préc."
            />
            <StatCard
              title="Total des revenus"
              value={formatAmount(data.total_revenus)}
              subtitle={`Ce mois : ${formatAmount(data.revenus_mois)}`}
              icon={TrendingUp}
              tone="income"
              evolutionPct={data.revenus_evolution_pct}
              evolutionLabel="vs mois préc."
            />
            <StatCard
              title="Total des dépenses"
              value={formatAmount(data.total_depenses)}
              subtitle={`Ce mois : ${formatAmount(data.depenses_mois)}`}
              icon={TrendingDown}
              tone="expense"
              evolutionPct={data.depenses_evolution_pct}
              evolutionLabel="vs mois préc."
              invertEvolutionColor
            />
            <StatCard
              title="Épargne"
              value={formatAmount(data.epargne)}
              subtitle={`Taux d'épargne : ${data.taux_epargne.toFixed(1)} %`}
              icon={PiggyBank}
              tone={data.epargne >= 0 ? 'income' : 'warning'}
              evolutionPct={data.epargne_evolution_pct}
              evolutionLabel="vs mois préc."
            />
          </div>

          {/* Section 2 : 3 Cartes complémentaires */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title={`Revenus de ${MONTH_NAMES_FR[mois - 1]}`}
              value={formatAmount(data.revenus_mois)}
              subtitle="Entrées du mois sélectionné"
              icon={ArrowUpRight}
              tone="income"
              evolutionPct={data.revenus_evolution_pct}
            />
            <StatCard
              title={`Dépenses de ${MONTH_NAMES_FR[mois - 1]}`}
              value={formatAmount(data.depenses_mois)}
              subtitle="Sorties du mois sélectionné"
              icon={ArrowDownRight}
              tone="expense"
              evolutionPct={data.depenses_evolution_pct}
              invertEvolutionColor
            />
            <StatCard
              title="Nombre de transactions"
              value={String(data.nombre_transactions)}
              subtitle={`${data.transactions_mois} sur ${MONTH_NAMES_FR[mois - 1]} ${annee}`}
              icon={Hash}
              tone="neutral"
            />
          </div>

          {/* Section 3 : Deux grandes cartes graphiques */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Graphique 1 : Courbes lisses Revenus et dépenses par mois */}
            <div className="fm-card p-6 lg:col-span-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Revenus et dépenses par mois
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Comparaison des flux mensuels
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-[#E8EDF3] bg-[#F5F7FA] p-1 dark:border-slate-700/80 dark:bg-[#18243A]">
                  {[
                    { key: '6', label: '6 mois' },
                    { key: '12', label: '12 mois' },
                    { key: 'all', label: 'Tout' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setChartWindow(opt.key as '6' | '12' | 'all')}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        chartWindow === opt.key
                          ? 'bg-white text-[#315CF5] shadow-sm dark:bg-[#111C2E] dark:text-[#6D8AFF]'
                          : 'text-[#64748B] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="mois_label"
                      tick={{ fontSize: 10, fill: axisColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: axisColor }}
                      axisLine={false}
                      tickLine={false}
                      width={58}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => formatAmount(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="revenus"
                      name="Revenus"
                      stroke={isDark ? '#34D399' : '#059669'}
                      strokeWidth={2.75}
                      dot={{ r: 3.5, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive
                    />
                    <Line
                      type="monotone"
                      dataKey="depenses"
                      name="Dépenses"
                      stroke={isDark ? '#FB7185' : '#E5484D'}
                      strokeWidth={2.75}
                      dot={{ r: 3.5, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique 2 : Donut des dépenses par catégorie */}
            <div className="fm-card p-6 lg:col-span-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Dépenses par catégorie
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Répartition en pourcentage
                  </p>
                </div>
                <div className="inline-flex rounded-xl border border-[#E8EDF3] bg-[#F5F7FA] p-1 dark:border-slate-700/80 dark:bg-[#18243A]">
                  <button
                    onClick={() => setDonutScope('month')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      donutScope === 'month'
                        ? 'bg-white text-[#315CF5] shadow-sm dark:bg-[#111C2E] dark:text-[#6D8AFF]'
                        : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    Ce mois
                  </button>
                  <button
                    onClick={() => setDonutScope('global')}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      donutScope === 'global'
                        ? 'bg-white text-[#315CF5] shadow-sm dark:bg-[#111C2E] dark:text-[#6D8AFF]'
                        : 'text-[#64748B] dark:text-[#94A3B8]'
                    }`}
                  >
                    Global
                  </button>
                </div>
              </div>

              {donutCategories.length === 0 ? (
                <div className="h-64 sm:h-80 flex items-center justify-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Aucune dépense sur cette période.
                </div>
              ) : (
                <div className="h-72 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutCategories}
                        dataKey="montant"
                        nameKey="categorie"
                        cx="50%"
                        cy="44%"
                        innerRadius={52}
                        outerRadius={82}
                        paddingAngle={3}
                        stroke="none"
                        isAnimationActive
                      >
                        {donutCategories.map((entry) => (
                          <Cell key={entry.categorie} fill={entry.couleur} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string, props: { payload?: { pourcentage?: number } }) => [
                          `${formatAmount(value)} (${props?.payload?.pourcentage ?? 0} %)`,
                          name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        formatter={(value: string) => {
                          const item = donutCategories.find((d) => d.categorie === value);
                          return item ? `${value} (${item.pourcentage.toFixed(0)} %)` : value;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Section 4 : Dernières transactions, Top 5 catégories, État des budgets & Alertes */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Dernières transactions */}
            <div className="fm-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E8EDF3] px-6 py-4 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Dernières transactions
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Activité récente sur votre compte
                  </p>
                </div>
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
                >
                  Tout voir
                </Link>
              </div>
              <div className="divide-y divide-[#E8EDF3] dark:divide-slate-800">
                {data.transactions_recentes.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-[#F5F7FA]/60 dark:hover:bg-[#18243A]/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#111827] dark:text-[#F8FAFC]">
                        {tx.description || tx.categorie}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        {tx.categorie} · {formatDateFR(tx.date)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                        tx.type === 'revenu'
                          ? 'text-[#059669] dark:text-[#34D399]'
                          : 'text-[#E5484D] dark:text-[#FB7185]'
                      }`}
                    >
                      {tx.type === 'revenu' ? '+' : '-'} {formatAmount(tx.montant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 des catégories de dépenses */}
            <div className="fm-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Top 5 des catégories de dépenses
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Postes les plus importants ({MONTH_NAMES_FR[mois - 1]} {annee})
                  </p>
                </div>
                <Link
                  to="/rapports"
                  className="text-xs font-semibold text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
                >
                  Analyser
                </Link>
              </div>

              {top5Categories.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Aucune dépense enregistrée.
                </p>
              ) : (
                <div className="space-y-4">
                  {top5Categories.map((cat) => (
                    <div key={cat.categorie} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-[#111827] dark:text-[#F8FAFC]">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.couleur }}
                          />
                          {cat.categorie}
                        </span>
                        <span className="font-semibold tabular-nums text-[#111827] dark:text-[#F8FAFC]">
                          {formatAmount(cat.montant)}{' '}
                          <span className="text-[#64748B] dark:text-[#94A3B8] font-normal">
                            ({cat.pourcentage.toFixed(1)} %)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F7FA] dark:bg-[#18243A]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, cat.pourcentage)}%`,
                            backgroundColor: cat.couleur,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* État des budgets */}
            <div className="fm-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    État des budgets
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Suivi pour {MONTH_NAMES_FR[mois - 1]} {annee}
                  </p>
                </div>
                <Link
                  to="/budgets"
                  className="text-xs font-semibold text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
                >
                  Gérer
                </Link>
              </div>

              {data.budgets_mois.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#64748B] dark:text-[#94A3B8]">
                  Aucun budget configuré pour cette période.
                </p>
              ) : (
                <div className="space-y-4">
                  {data.budgets_mois.slice(0, 5).map((b) => {
                    const barColor =
                      b.alerte_niveau === 'exceeded'
                        ? 'bg-[#E5484D] dark:bg-[#FB7185]'
                        : b.alerte_niveau === 'critical'
                        ? 'bg-orange-500'
                        : b.alerte_niveau === 'warning'
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#059669] dark:bg-[#34D399]';
                    return (
                      <div key={b.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#111827] dark:text-[#F8FAFC]">
                            {b.categorie}
                          </span>
                          <span className="tabular-nums text-[#64748B] dark:text-[#94A3B8]">
                            <strong className="text-[#111827] dark:text-[#F8FAFC]">
                              {formatAmount(b.montant_consomme)}
                            </strong>{' '}
                            / {formatAmount(b.montant_limite)} ({b.pourcentage_utilise.toFixed(0)} %)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F7FA] dark:bg-[#18243A]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${Math.min(100, b.pourcentage_utilise)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alertes financières */}
            <div className="fm-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Alertes financières
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Surveillance des seuils (75 %, 90 %, 100 %)
                  </p>
                </div>
                <span className="rounded-full bg-[#F5F7FA] px-2.5 py-0.5 text-xs font-semibold text-[#64748B] dark:bg-[#18243A] dark:text-[#94A3B8]">
                  {data.budgets_alertes.length} alerte(s)
                </span>
              </div>

              {data.budgets_alertes.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#059669]/20 bg-[#059669]/5 p-4 text-sm text-[#059669] dark:border-[#34D399]/20 dark:bg-[#34D399]/10 dark:text-[#34D399]">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Tous vos budgets sont maîtrisés</p>
                    <p className="text-xs opacity-85">
                      Aucune catégorie n'a dépassé le seuil d'alerte de 75 % ce mois-ci.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.budgets_alertes.map((b) => {
                    const style =
                      b.alerte_niveau === 'exceeded'
                        ? 'border-[#E5484D]/25 bg-[#E5484D]/5 text-[#E5484D] dark:border-[#FB7185]/30 dark:bg-[#FB7185]/10 dark:text-[#FB7185]'
                        : b.alerte_niveau === 'critical'
                        ? 'border-orange-500/25 bg-orange-500/5 text-orange-700 dark:text-orange-300'
                        : 'border-[#F59E0B]/25 bg-[#F59E0B]/5 text-amber-800 dark:text-[#F59E0B]';
                    return (
                      <div key={b.id} className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs ${style}`}>
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{b.categorie}</span>
                            <span className="font-bold tabular-nums">{b.pourcentage_utilise.toFixed(1)} %</span>
                          </div>
                          <p className="mt-0.5 opacity-90">{b.alerte_message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
