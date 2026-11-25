import type { DisplayCurrency } from '../types';

export const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const CURRENCY_CONFIG: Record<DisplayCurrency, { rateFromMad: number; symbol: string }> = {
  MAD: { rateFromMad: 1, symbol: 'DH' },
  EUR: { rateFromMad: 0.092, symbol: '€' },
  USD: { rateFromMad: 0.1, symbol: '$' },
};

/**
 * Formate un montant stocké en MAD selon la devise d'affichage choisie (par défaut MAD -> 1 500,00 DH).
 */
export function formatCurrency(amountInMad: number, currency: DisplayCurrency = 'MAD'): string {
  const safeValue = Number.isFinite(amountInMad) ? amountInMad : 0;
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.MAD;
  const converted = safeValue * cfg.rateFromMad;
  const isNegative = converted < 0;
  const abs = Math.abs(converted);
  const parts = abs.toFixed(2).split('.');
  const integerFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${isNegative ? '-' : ''}${integerFormatted},${parts[1]} ${cfg.symbol}`;
}

export function formatMAD(amount: number): string {
  return formatCurrency(amount, 'MAD');
}

export function formatDateFR(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toInputDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}
