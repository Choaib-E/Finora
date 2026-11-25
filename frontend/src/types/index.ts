export type TransactionType = 'revenu' | 'depense';

export type AlertLevel = 'ok' | 'warning' | 'critical' | 'exceeded';

export type DisplayCurrency = 'MAD' | 'EUR' | 'USD';

export interface User {
  id: string;
  Id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  currency: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  montant: number;
  categorie: string;
  type: TransactionType;
  description: string;
  created_at: string;
}

export interface TransactionPayload {
  date: string;
  montant: number;
  categorie: string;
  type: TransactionType;
  description: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  total_revenus: number;
  total_depenses: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface Category {
  id: string;
  user_id: string;
  nom: string;
  type: TransactionType;
  couleur: string;
  transaction_count: number;
  created_at: string;
}

export interface CategoryPayload {
  nom: string;
  type: TransactionType;
  couleur: string;
}

export interface Budget {
  id: string;
  user_id: string;
  categorie: string;
  montant_limite: number;
  periode: string;
  mois: number;
  annee: number;
  montant_consomme: number;
  montant_restant: number;
  pourcentage_utilise: number;
  alerte_niveau: AlertLevel;
  alerte_message?: string | null;
  created_at: string;
}

export interface BudgetPayload {
  categorie: string;
  montant_limite: number;
  periode?: 'mensuelle';
  mois: number;
  annee: number;
}

export interface CategoryBreakdownItem {
  categorie: string;
  montant: number;
  couleur: string;
  pourcentage: number;
}

export interface MonthlyEvolutionItem {
  periode: string;
  mois_label: string;
  annee: number;
  mois: number;
  revenus: number;
  depenses: number;
  epargne: number;
}

export interface BalanceEvolutionItem {
  date: string;
  solde: number;
  revenus: number;
  depenses: number;
}

export interface DashboardData {
  solde_total: number;
  total_revenus: number;
  total_depenses: number;
  epargne: number;
  taux_epargne: number;
  nombre_transactions: number;
  transactions_mois: number;
  revenus_mois: number;
  depenses_mois: number;
  epargne_mois: number;
  solde_evolution_pct?: number | null;
  revenus_evolution_pct?: number | null;
  depenses_evolution_pct?: number | null;
  epargne_evolution_pct?: number | null;
  mois_selectionne: number;
  annee_selectionnee: number;
  depenses_par_categorie: CategoryBreakdownItem[];
  depenses_par_categorie_mois: CategoryBreakdownItem[];
  evolution_mensuelle: MonthlyEvolutionItem[];
  evolution_solde: BalanceEvolutionItem[];
  transactions_recentes: Transaction[];
  budgets_mois: Budget[];
  budgets_alertes: Budget[];
  has_data: boolean;
}

export interface CsvImportErrorItem {
  row_number: number;
  raw_data: string;
  error: string;
}

export interface CsvImportUserSummary {
  user_code: string;
  imported_count: number;
}

export interface CsvImportResponse {
  total_rows: number;
  imported_count: number;
  duplicates_skipped: number;
  error_count: number;
  errors: CsvImportErrorItem[];
  summary_by_user: CsvImportUserSummary[];
}

export interface ReportSummary {
  total_revenus: number;
  total_depenses: number;
  epargne_nette: number;
  taux_epargne: number;
  nombre_transactions: number;
  depenses_par_categorie: CategoryBreakdownItem[];
  comparaison_mensuelle: MonthlyEvolutionItem[];
  evolution_solde: BalanceEvolutionItem[];
}
