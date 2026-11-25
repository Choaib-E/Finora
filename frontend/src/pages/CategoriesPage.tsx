import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Edit2, Plus, Tags, Trash2 } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { categoriesApi, getApiErrorMessage } from '../services/api';
import type { Category, TransactionType } from '../types';

const PRESET_COLORS = [
  '#315CF5',
  '#059669',
  '#F59E0B',
  '#E5484D',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#64748B',
];

export const CategoriesPage: React.FC = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | TransactionType>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({
    nom: '',
    type: 'depense' as TransactionType,
    couleur: '#315CF5',
  });
  const [saving, setSaving] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur de chargement des catégories.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setEditingCat(null);
    setForm({ nom: '', type: 'depense', couleur: '#315CF5' });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({ nom: cat.nom, type: cat.type, couleur: cat.couleur });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCat) {
        await categoriesApi.update(editingCat.id, form);
        showToast('Catégorie mise à jour.', 'success');
      } else {
        await categoriesApi.create(form);
        showToast('Catégorie ajoutée.', 'success');
      }
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    try {
      await categoriesApi.remove(deletingCat.id);
      showToast('Catégorie supprimée.', 'success');
      setDeletingCat(null);
      loadCategories();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la suppression.'), 'error');
    }
  };

  const filtered =
    activeTab === 'all' ? categories : categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Catégories
          </h1>
          <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
            Organisez vos revenus et dépenses avec des libellés et couleurs personnalisés
          </p>
        </div>
        <button onClick={openCreate} className="fm-btn-primary">
          <Plus className="h-4 w-4" />
          <span>Nouvelle catégorie</span>
        </button>
      </div>

      {/* Filtre par type */}
      <div className="inline-flex w-full sm:w-auto overflow-x-auto rounded-xl border border-[#E8EDF3] bg-white p-1 shadow-card dark:border-slate-700/80 dark:bg-[#111C2E]">
        {[
          { key: 'all', label: `Toutes (${categories.length})` },
          { key: 'depense', label: `Dépenses (${categories.filter((c) => c.type === 'depense').length})` },
          { key: 'revenu', label: `Revenus (${categories.filter((c) => c.type === 'revenu').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'all' | TransactionType)}
            className={`flex-1 sm:flex-none min-h-[40px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-[#315CF5] text-white dark:bg-[#6D8AFF] dark:text-[#0B1120]'
                : 'text-[#64748B] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fm-card h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aucune catégorie"
          description="Créez votre première catégorie pour classer vos opérations."
          actionLabel="Créer une catégorie"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cat) => (
            <div key={cat.id} className="fm-card-hover p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: cat.couleur }}
                >
                  <Tags className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    {cat.nom}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        cat.type === 'revenu'
                          ? 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]'
                          : 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]'
                      }`}
                    >
                      {cat.type === 'revenu' ? 'Revenu' : 'Dépense'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                      <ArrowLeftRight className="h-3 w-3" />
                      {cat.transaction_count} transaction{cat.transaction_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="fm-icon-btn text-[#64748B] hover:bg-slate-100 hover:text-[#315CF5] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#6D8AFF]"
                  title="Modifier"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeletingCat(cat)}
                  className="fm-icon-btn text-[#64748B] hover:bg-rose-50 hover:text-[#E5484D] dark:text-[#94A3B8] dark:hover:bg-rose-500/10 dark:hover:text-[#FB7185]"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création / Modification */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Nom de la catégorie
            </label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Abonnements"
              className="fm-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as TransactionType })}
              className="fm-input"
            >
              <option value="depense">Dépense</option>
              <option value="revenu">Revenu</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-2">
              Couleur
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setForm({ ...form, couleur: hex })}
                  className={`h-7 w-7 rounded-lg transition-transform ${
                    form.couleur.toUpperCase() === hex ? 'scale-110 ring-2 ring-[#315CF5] ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: hex }}
                  aria-label={`Couleur ${hex}`}
                />
              ))}
              <input
                type="color"
                value={form.couleur}
                onChange={(e) => setForm({ ...form, couleur: e.target.value.toUpperCase() })}
                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
              />
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
        open={Boolean(deletingCat)}
        onClose={() => setDeletingCat(null)}
        title="Supprimer la catégorie"
      >
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Supprimer la catégorie <strong className="text-[#111827] dark:text-[#F8FAFC]">{deletingCat?.nom}</strong> ? Les transactions existantes conserveront leur libellé.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setDeletingCat(null)} className="fm-btn-secondary">
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
