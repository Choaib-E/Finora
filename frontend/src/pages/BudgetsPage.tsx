import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Edit2,
  Percent,
  PiggyBank,
  Plus,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { budgetsApi, categoriesApi, getApiErrorMessage } from '../services/api';
import type { Budget, Category } from '../types';
import { MONTH_NAMES_FR } from '../utils/formatters';

export const BudgetsPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatAmount } = usePreferences();

  const now = new Date();
  const [mois, setMois] = useState<number>(now.getMonth() + 1);
  const [annee, setAnnee] = useState<number>(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({
    categorie: 'Global',
    montant_limite: '',
    mois: now.getMonth() + 1,
    annee: now.getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bData, cData] = await Promise.all([
        budgetsApi.list({ mois, annee }),
        categoriesApi.list('depense'),
      ]);
      setBudgets(bData);
      setCategories(cData);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors du chargement des budgets.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [mois, annee, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcul des totaux budgétaires sans double-comptage si un budget Global existe
  const summary = useMemo(() => {
    const globalBudget = budgets.find((b) => b.categorie.toLowerCase() === 'global');
    const categoryBudgets = budgets.filter((b) => b.categorie.toLowerCase() !== 'global');

    const totalBudget = globalBudget
      ? globalBudget.montant_limite
      : categoryBudgets.reduce((acc, b) => acc + b.montant_limite, 0);

    const totalSpent = globalBudget
      ? globalBudget.montant_consomme
      : categoryBudgets.reduce((acc, b) => acc + b.montant_consomme, 0);

    const remaining = totalBudget - totalSpent;
    const pct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      remaining: Math.round(remaining * 100) / 100,
      pct: Math.round(pct * 10) / 10,
    };
  }, [budgets]);

  const openCreate = () => {
    setEditingBudget(null);
    setForm({
      categorie: categories[0]?.nom || 'Global',
      montant_limite: '',
      mois,
      annee,
    });
    setModalOpen(true);
  };

  const openEdit = (b: Budget) => {
    setEditingBudget(b);
    setForm({
      categorie: b.categorie,
      montant_limite: String(b.montant_limite),
      mois: b.mois,
      annee: b.annee,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(form.montant_limite);
    if (!Number.isFinite(limit) || limit <= 0) {
      showToast('Le plafond doit être strictement positif.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget.id, {
          categorie: form.categorie,
          montant_limite: limit,
          mois: form.mois,
          annee: form.annee,
        });
        showToast('Budget mis à jour.', 'success');
      } else {
        await budgetsApi.create({
          categorie: form.categorie,
          montant_limite: limit,
          periode: 'mensuelle',
          mois: form.mois,
          annee: form.annee,
        });
        showToast('Budget défini avec succès.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde du budget.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingBudget) return;
    try {
      await budgetsApi.remove(deletingBudget.id);
      showToast('Budget supprimé.', 'success');
      setDeletingBudget(null);
      loadData();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la suppression.'), 'error');
    }
  };

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i);

  const progressColor = (level: Budget['alerte_niveau']) => {
    switch (level) {
      case 'exceeded':
        return 'bg-[#E5484D] dark:bg-[#FB7185]';
      case 'critical':
        return 'bg-orange-500';
      case 'warning':
        return 'bg-[#F59E0B]';
      default:
        return 'bg-[#059669] dark:bg-[#34D399]';
    }
  };

  const badgeStyle = (level: Budget['alerte_niveau']) => {
    switch (level) {
      case 'exceeded':
        return 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]';
      case 'critical':
        return 'bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
      case 'warning':
        return 'bg-[#F59E0B]/10 text-amber-700 dark:bg-[#F59E0B]/15 dark:text-[#F59E0B]';
      default:
        return 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]';
    }
  };

  const categoryChoices = Array.from(new Set(categories.map((c) => c.nom)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Budgets mensuels
          </h1>
          <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Suivez la consommation de vos plafonds (alertes à 75 %, 90 % et 100 %)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
          <div className="flex min-h-[44px] items-center justify-between sm:justify-start gap-2 rounded-xl border border-[#E8EDF3] bg-white px-3 py-2 shadow-card dark:border-slate-700/80 dark:bg-[#111C2E]">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <select
                value={mois}
                onChange={(e) => setMois(Number(e.target.value))}
                className="bg-transparent text-sm sm:text-xs font-semibold focus:outline-none"
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
              className="bg-transparent text-sm sm:text-xs font-semibold focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y} className="dark:bg-[#111C2E]">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button onClick={openCreate} className="fm-btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span>Définir un budget</span>
          </button>
        </div>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Budget total"
          value={formatAmount(summary.totalBudget)}
          subtitle={`${budgets.length} budget(s) sur ${MONTH_NAMES_FR[mois - 1]}`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          title="Montant dépensé"
          value={formatAmount(summary.totalSpent)}
          subtitle="Consommation réelle"
          icon={TrendingDown}
          tone="expense"
        />
        <StatCard
          title="Montant restant"
          value={formatAmount(summary.remaining)}
          subtitle={summary.remaining >= 0 ? 'Marge disponible' : 'Dépassement'}
          icon={PiggyBank}
          tone={summary.remaining >= 0 ? 'income' : 'expense'}
        />
        <StatCard
          title="Pourcentage consommé"
          value={`${summary.pct.toFixed(1)} %`}
          subtitle={summary.pct >= 100 ? 'Seuil dépassé' : summary.pct >= 75 ? 'Vigilance' : 'Sous contrôle'}
          icon={Percent}
          tone={summary.pct >= 100 ? 'expense' : summary.pct >= 75 ? 'warning' : 'income'}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fm-card h-44 animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title={`Aucun budget défini pour ${MONTH_NAMES_FR[mois - 1]} ${annee}`}
          description="Définissez un budget mensuel par catégorie ou global pour suivre vos dépenses et recevoir des alertes automatiques."
          actionLabel="Créer un budget"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {budgets.map((b) => {
            const widthPct = Math.min(100, Math.max(0, b.pourcentage_utilise));
            return (
              <div key={b.id} className="fm-card-hover p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">
                        {b.categorie === 'Global' ? 'Budget Mensuel Global' : b.categorie}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle(
                          b.alerte_niveau
                        )}`}
                      >
                        {b.alerte_niveau === 'ok' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {b.pourcentage_utilise.toFixed(1)} %
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {MONTH_NAMES_FR[b.mois - 1]} {b.annee} · Autorisé : {formatAmount(b.montant_limite)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      className="fm-icon-btn text-[#64748B] hover:bg-slate-100 hover:text-[#315CF5] dark:text-[#94A3B8] dark:hover:bg-[#18243A]"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingBudget(b)}
                      className="fm-icon-btn text-[#64748B] hover:bg-rose-50 hover:text-[#E5484D] dark:text-[#94A3B8] dark:hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Barre de progression */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F5F7FA] dark:bg-[#18243A]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressColor(b.alerte_niveau)}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#F5F7FA] p-3 dark:bg-[#18243A]">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Dépenses actuelles</span>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#111827] dark:text-[#F8FAFC]">
                      {formatAmount(b.montant_consomme)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F5F7FA] p-3 dark:bg-[#18243A]">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Montant restant</span>
                    <p
                      className={`mt-0.5 text-sm font-semibold tabular-nums ${
                        b.montant_restant < 0
                          ? 'text-[#E5484D] dark:text-[#FB7185]'
                          : 'text-[#059669] dark:text-[#34D399]'
                      }`}
                    >
                      {formatAmount(b.montant_restant)}
                    </p>
                  </div>
                </div>

                {b.alerte_message && (
                  <div
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${badgeStyle(
                      b.alerte_niveau
                    )}`}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{b.alerte_message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudget ? 'Modifier le budget' : 'Définir un budget mensuel'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Catégorie (ou Global)
            </label>
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              className="fm-input"
            >
              <option value="Global">Budget Mensuel Global</option>
              {categoryChoices.map((nom) => (
                <option key={nom} value={nom}>
                  {nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Montant limite (MAD / DH)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="1"
              required
              value={form.montant_limite}
              onChange={(e) => setForm({ ...form, montant_limite: e.target.value })}
              placeholder="1500"
              className="fm-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Mois
              </label>
              <select
                value={form.mois}
                onChange={(e) => setForm({ ...form, mois: Number(e.target.value) })}
                className="fm-input"
              >
                {MONTH_NAMES_FR.map((label, idx) => (
                  <option key={label} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Année
              </label>
              <select
                value={form.annee}
                onChange={(e) => setForm({ ...form, annee: Number(e.target.value) })}
                className="fm-input"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="fm-btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="fm-btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deletingBudget)}
        onClose={() => setDeletingBudget(null)}
        title="Supprimer le budget"
      >
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Supprimer le budget <strong className="text-[#111827] dark:text-[#F8FAFC]">{deletingBudget?.categorie}</strong> pour{' '}
          <strong className="text-[#111827] dark:text-[#F8FAFC]">
            {deletingBudget ? `${MONTH_NAMES_FR[deletingBudget.mois - 1]} ${deletingBudget.annee}` : ''}
          </strong>{' '}
          ?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setDeletingBudget(null)} className="fm-btn-secondary">
            Annuler
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center justify-center rounded-xl bg-[#E5484D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D43B40]"
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </div>
  );
};
