import React, { createContext, useContext, useState } from 'react';
import type { DisplayCurrency } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PreferencesContextValue {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  language: 'fr';
  setLanguage: (lang: 'fr') => void;
  formatAmount: (amountInMad: number) => string;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<DisplayCurrency>(() => {
    const saved = localStorage.getItem('finora_currency') || localStorage.getItem('fm_currency');
    if (saved === 'MAD' || saved === 'EUR' || saved === 'USD') return saved;
    return 'MAD';
  });
  const [language, setLanguage] = useState<'fr'>('fr');

  const setCurrency = (next: DisplayCurrency) => {
    setCurrencyState(next);
    localStorage.setItem('finora_currency', next);
  };

  const formatAmount = (amountInMad: number) => formatCurrency(amountInMad, currency);

  return (
    <PreferencesContext.Provider
      value={{
        currency,
        setCurrency,
        language,
        setLanguage,
        formatAmount,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences doit être utilisé dans un PreferencesProvider');
  return ctx;
}
