import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { categoriesApi, getApiErrorMessage, transactionsApi } from '../services/api';
import type { Category, TransactionType } from '../types';

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [type, setType] = useState<TransactionType>('depense');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categorie, setCategorie] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [touched, setTouched] = useState<{ montant?: boolean; date?: boolean; categorie?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.some((c) => c.nom === categorie)) {
      setCategorie(filteredCategories[0].nom);
    }
  }, [type, filteredCategories, categorie]);

  const errors = useMemo(() => {
    const e: { montant?: string; date?: string; categorie?: string } = {};
    const num = Number(montant);
    if (!montant || !Number.isFinite(num) || num <= 0) {
      e.montant = 'Saisissez un montant strictement supérieur à 0.';
    }
    if (!date) {
      e.date = 'La date est obligatoire.';
    }
    if (!categorie.trim()) {
      e.categorie = 'Veuillez choisir une catégorie.';
    }
    return e;
  }, [montant, date, categorie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ montant: true, date: true, categorie: true });
    if (Object.keys(errors).length > 0) {
      showToast('Veuillez corriger les champs signalés.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await transactionsApi.create({
        type,
        montant: Number(montant),
        date,
        categorie: categorie.trim(),
        description: description.trim(),
      });
      showToast('Transaction confirmée et enregistrée dans MongoDB.', 'success');
      navigate('/transactions');
    } catch (err) {
      showToast(getApiErrorMessage(err, "Erreur réseau : la transaction n'a pas été enregistrée."), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="fm-btn-secondary px-3"
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Nouvelle transaction
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Enregistrez un revenu ou une dépense (en MAD)
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="fm-card p-5 sm:p-6 space-y-5">
        {/* Sélecteur visuel de type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">
            Type d'opération
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType('depense')}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                type === 'depense'
                  ? 'border-[#E5484D] bg-[#E5484D]/10 text-[#E5484D] shadow-sm dark:border-[#FB7185] dark:bg-[#FB7185]/15 dark:text-[#FB7185]'
                  : 'border-[#E8EDF3] text-[#64748B] hover:bg-[#F5F7FA] dark:border-slate-700/80 dark:text-[#94A3B8] dark:hover:bg-[#18243A]'
              }`}
            >
              <ArrowDownRight className="h-4 w-4" />
              <span>Dépense</span>
            </button>

            <button
              type="button"
              onClick={() => setType('revenu')}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                type === 'revenu'
                  ? 'border-[#059669] bg-[#059669]/10 text-[#059669] shadow-sm dark:border-[#34D399] dark:bg-[#34D399]/15 dark:text-[#34D399]'
                  : 'border-[#E8EDF3] text-[#64748B] hover:bg-[#F5F7FA] dark:border-slate-700/80 dark:text-[#94A3B8] dark:hover:bg-[#18243A]'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Revenu</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Montant (MAD / DH)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={montant}
              onBlur={() => setTouched((t) => ({ ...t, montant: true }))}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="250.50"
              className="fm-input tabular-nums text-lg font-semibold"
            />
            {touched.montant && errors.montant && (
              <p className="mt-1.5 text-xs text-[#E5484D] dark:text-[#FB7185]">{errors.montant}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onBlur={() => setTouched((t) => ({ ...t, date: true }))}
              onChange={(e) => setDate(e.target.value)}
              className="fm-input"
            />
            {touched.date && errors.date && (
              <p className="mt-1.5 text-xs text-[#E5484D] dark:text-[#FB7185]">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Sélecteur ergonomique de catégorie (chips tactiles + select) */}
        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-2">
            Catégorie
          </label>
          {filteredCategories.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {filteredCategories.map((c) => {
                  const selected = categorie === c.nom;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategorie(c.nom)}
                      className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                        selected
                          ? 'border-[#315CF5] bg-[#315CF5]/10 text-[#315CF5] dark:border-[#6D8AFF] dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]'
                          : 'border-[#E8EDF3] bg-[#F5F7FA]/70 text-[#64748B] hover:text-[#111827] dark:border-slate-700/80 dark:bg-[#18243A] dark:text-[#94A3B8]'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
                      <span>{c.nom}</span>
                    </button>
                  );
                })}
              </div>
              <select
                value={categorie}
                onBlur={() => setTouched((t) => ({ ...t, categorie: true }))}
                onChange={(e) => setCategorie(e.target.value)}
                className="fm-input"
                aria-label="Catégorie sélectionnée"
              >
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.nom}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="text"
              value={categorie}
              onBlur={() => setTouched((t) => ({ ...t, categorie: true }))}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder="Ex: Alimentation"
              className="fm-input"
            />
          )}
          {touched.categorie && errors.categorie && (
            <p className="mt-1.5 text-xs text-[#E5484D] dark:text-[#FB7185]">{errors.categorie}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
            Description
          </label>
          <input
            type="text"
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Courses Carrefour"
            className="fm-input"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="fm-btn-secondary w-full sm:w-auto"
          >
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="fm-btn-primary w-full sm:w-auto">
            <Check className="h-4 w-4" />
            <span>{submitting ? 'Enregistrement en cours...' : 'Enregistrer la transaction'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
