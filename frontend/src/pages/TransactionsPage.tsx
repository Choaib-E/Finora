import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownUp,
  ArrowLeftRight,
  Edit2,
  Hash,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { StatCard } from '../components/StatCard';
import { usePreferences } from '../contexts/PreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { categoriesApi, getApiErrorMessage, transactionsApi } from '../services/api';
import type { Category, Transaction, TransactionType } from '../types';
import { formatDateFR, toInputDate } from '../utils/formatters';

export const TransactionsPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatAmount } = usePreferences();

  const [items, setItems] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRevenus, setTotalRevenus] = useState(0);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'montant'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    montant: '',
    categorie: '',
    type: 'depense' as TransactionType,
    description: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType) count += 1;
    if (filterCategory) count += 1;
    if (dateFrom) count += 1;
    if (dateTo) count += 1;
    if (sortBy !== 'date' || sortOrder !== 'desc') count += 1;
    return count;
  }, [filterType, filterCategory, dateFrom, dateTo, sortBy, sortOrder]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list({
        search,
        type: filterType,
        categorie: filterCategory,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        limit: 20,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalRevenus(res.total_revenus);
      setTotalDepenses(res.total_depenses);
      setTotalPages(res.total_pages);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors du chargement des transactions.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterCategory, dateFrom, dateTo, sortBy, sortOrder, page, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  const openEdit = (tx: Transaction) => {
    setOpenMenuId(null);
    setEditingTx(tx);
    setEditForm({
      date: toInputDate(tx.date),
      montant: String(tx.montant),
      categorie: tx.categorie,
      type: tx.type,
      description: tx.description,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSavingEdit(true);
    try {
      await transactionsApi.update(editingTx.id, {
        date: editForm.date,
        montant: Number(editForm.montant),
        categorie: editForm.categorie,
        type: editForm.type,
        description: editForm.description,
      });
      showToast('Transaction mise à jour.', 'success');
      setEditingTx(null);
      fetchTransactions();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la modification.'), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setDeleting(true);
    try {
      await transactionsApi.remove(deletingTx.id);
      showToast('Transaction supprimée.', 'success');
      setDeletingTx(null);
      fetchTransactions();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors de la suppression.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  const categoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.nom))),
    [categories]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
            Transactions
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
            Consultez, filtrez et gérez l'historique de vos opérations
          </p>
        </div>
        <Link to="/transactions/nouvelle" className="fm-btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span>Ajouter une transaction</span>
        </Link>
      </div>

      {/* Zone de statistiques */}
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="Transactions"
          value={String(total)}
          subtitle="Sur la sélection"
          icon={Hash}
          tone="primary"
        />
        <StatCard
          title="Total revenus"
          value={formatAmount(totalRevenus)}
          subtitle="Entrées"
          icon={TrendingUp}
          tone="income"
        />
        <div className="min-[440px]:col-span-2 sm:col-span-1">
          <StatCard
            title="Total dépenses"
            value={formatAmount(totalDepenses)}
            subtitle="Sorties"
            icon={TrendingDown}
            tone="expense"
          />
        </div>
      </div>

      {/* Barre de recherche & bouton Filtres sur Mobile (< md) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher..."
            className="fm-input pl-10"
          />
        </div>
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="fm-btn-secondary shrink-0 px-3.5 relative"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#315CF5] px-1 text-[10px] font-bold text-white dark:bg-[#6D8AFF] dark:text-[#0B1120]">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtres complets sur Desktop (>= md) */}
      <div className="hidden md:block fm-card p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher par description ou catégorie..."
              className="fm-input pl-10"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as TransactionType | '');
              setPage(1);
            }}
            className="fm-input"
            aria-label="Filtrer par type"
          >
            <option value="">Tous les types</option>
            <option value="revenu">Revenus</option>
            <option value="depense">Dépenses</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="fm-input"
            aria-label="Filtrer par catégorie"
          >
            <option value="">Toutes catégories</option>
            {categoryNames.map((nom) => (
              <option key={nom} value={nom}>
                {nom}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="fm-input"
            aria-label="Date début"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="fm-input"
            aria-label="Date fin"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
            <ArrowDownUp className="h-3.5 w-3.5" />
            <span>Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'montant')}
              className="rounded-lg border border-[#E8EDF3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111827] dark:border-slate-700 dark:bg-[#18243A] dark:text-[#F8FAFC]"
            >
              <option value="date">Date</option>
              <option value="montant">Montant</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="rounded-lg border border-[#E8EDF3] bg-white px-2.5 py-1.5 text-xs font-medium text-[#111827] dark:border-slate-700 dark:bg-[#18243A] dark:text-[#F8FAFC]"
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </div>
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      {/* Liste / Tableau */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fm-card h-20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Aucune transaction trouvée"
          description="Aucune opération ne correspond à vos critères actuels. Ajoutez une transaction ou réinitialisez vos filtres."
          actionLabel="Nouvelle transaction"
          actionTo="/transactions/nouvelle"
        />
      ) : (
        <>
          {/* CARTES MOBILES (< md) — Zéro défilement horizontal */}
          <div className="space-y-3 md:hidden">
            {items.map((tx) => (
              <div key={tx.id} className="fm-card p-4 relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                      {tx.description || tx.categorie}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                      <span>{formatDateFR(tx.date)}</span>
                      <span>·</span>
                      <span className="font-medium text-[#111827] dark:text-[#F8FAFC]">
                        {tx.categorie}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)}
                    className="fm-icon-btn -mr-2 -mt-1 text-[#64748B] hover:bg-[#F5F7FA] dark:text-[#94A3B8] dark:hover:bg-[#18243A]"
                    aria-label="Actions de la transaction"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E8EDF3] pt-3 dark:border-slate-800/80">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      tx.type === 'revenu'
                        ? 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]'
                        : 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]'
                    }`}
                  >
                    {tx.type === 'revenu' ? 'Revenu' : 'Dépense'}
                  </span>

                  <span
                    className={`text-base font-bold tabular-nums ${
                      tx.type === 'revenu'
                        ? 'text-[#059669] dark:text-[#34D399]'
                        : 'text-[#E5484D] dark:text-[#FB7185]'
                    }`}
                  >
                    {tx.type === 'revenu' ? '+' : '-'} {formatAmount(tx.montant)}
                  </span>
                </div>

                {openMenuId === tx.id && (
                  <div className="absolute right-3 top-12 z-20 w-40 rounded-2xl border border-[#E8EDF3] bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-[#18243A]">
                    <button
                      onClick={() => openEdit(tx)}
                      className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold hover:bg-[#F5F7FA] dark:hover:bg-[#111C2E]"
                    >
                      <Edit2 className="h-4 w-4 text-[#315CF5] dark:text-[#6D8AFF]" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        setDeletingTx(tx);
                      }}
                      className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-[#E5484D] hover:bg-rose-50 dark:text-[#FB7185] dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TABLEAU DESKTOP (>= md) */}
          <div className="hidden md:block fm-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E8EDF3] bg-[#F5F7FA]/80 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:border-slate-800 dark:bg-[#18243A]/70 dark:text-[#94A3B8]">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Catégorie</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-right">Montant</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF3] dark:divide-slate-800/80">
                  {items.map((tx) => (
                    <tr
                      key={tx.id}
                      className="group transition-colors hover:bg-[#F5F7FA]/70 dark:hover:bg-[#18243A]/50"
                    >
                      <td className="px-5 py-3.5 text-xs font-medium text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                        {formatDateFR(tx.date)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-[#111827] dark:text-[#F8FAFC] max-w-xs truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-[#111827] dark:text-[#F8FAFC] whitespace-nowrap">
                        {tx.categorie}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            tx.type === 'revenu'
                              ? 'bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]'
                              : 'bg-[#E5484D]/10 text-[#E5484D] dark:bg-[#FB7185]/15 dark:text-[#FB7185]'
                          }`}
                        >
                          {tx.type === 'revenu' ? 'Revenu' : 'Dépense'}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap ${
                          tx.type === 'revenu'
                            ? 'text-[#059669] dark:text-[#34D399]'
                            : 'text-[#E5484D] dark:text-[#FB7185]'
                        }`}
                      >
                        {tx.type === 'revenu' ? '+' : '-'} {formatAmount(tx.montant)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(tx)}
                            className="fm-icon-btn text-[#64748B] hover:bg-slate-100 hover:text-[#315CF5] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#6D8AFF]"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingTx(tx)}
                            className="fm-icon-btn text-[#64748B] hover:bg-rose-50 hover:text-[#E5484D] dark:text-[#94A3B8] dark:hover:bg-rose-500/10 dark:hover:text-[#FB7185]"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination (Mobile + Desktop) */}
          {totalPages > 1 && (
            <div className="fm-card flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                Page {page} sur {totalPages} ({total} résultats)
              </span>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="fm-btn-secondary flex-1 sm:flex-none py-2 px-4 text-xs"
                >
                  Précédent
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="fm-btn-secondary flex-1 sm:flex-none py-2 px-4 text-xs"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modale Filtres Mobile */}
      <Modal
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filtrer et trier"
        subtitle="Affinez la liste de vos transactions"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as TransactionType | '');
                setPage(1);
              }}
              className="fm-input"
            >
              <option value="">Tous les types</option>
              <option value="revenu">Revenus</option>
              <option value="depense">Dépenses</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Catégorie
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="fm-input"
            >
              <option value="">Toutes catégories</option>
              {categoryNames.map((nom) => (
                <option key={nom} value={nom}>
                  {nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Du
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="fm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Au
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="fm-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Trier par
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'montant')}
                className="fm-input"
              >
                <option value="date">Date</option>
                <option value="montant">Montant</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Ordre
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="fm-input"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                resetFilters();
                setMobileFilterOpen(false);
              }}
              className="fm-btn-secondary flex-1"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(false)}
              className="fm-btn-primary flex-1"
            >
              Appliquer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Modification */}
      <Modal
        open={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title="Modifier la transaction"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Type
              </label>
              <select
                value={editForm.type}
                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as TransactionType })}
                className="fm-input"
              >
                <option value="depense">Dépense</option>
                <option value="revenu">Revenu</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Montant (MAD)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                value={editForm.montant}
                onChange={(e) => setEditForm({ ...editForm, montant: e.target.value })}
                className="fm-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                className="fm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Catégorie
              </label>
              <input
                type="text"
                required
                value={editForm.categorie}
                onChange={(e) => setEditForm({ ...editForm, categorie: e.target.value })}
                className="fm-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Description
            </label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="fm-input"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingTx(null)} className="fm-btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={savingEdit} className="fm-btn-primary">
              {savingEdit ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        open={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        title="Confirmer la suppression"
        subtitle="Cette opération sera définitivement supprimée."
      >
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
          Voulez-vous vraiment supprimer la transaction{' '}
          <strong className="text-[#111827] dark:text-[#F8FAFC]">{deletingTx?.categorie}</strong> de{' '}
          <strong className="text-[#111827] dark:text-[#F8FAFC]">
            {deletingTx ? formatAmount(deletingTx.montant) : ''}
          </strong>{' '}
          ?
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button onClick={() => setDeletingTx(null)} className="fm-btn-secondary">
            Annuler
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={deleting}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#E5484D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D43B40] disabled:opacity-50"
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
