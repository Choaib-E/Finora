import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { MainLayout } from './layouts/MainLayout';
import { AddTransactionPage } from './pages/AddTransactionPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CsvImportPage } from './pages/CsvImportPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';

const ROUTE_TITLES: Record<string, string> = {
  '/connexion': 'Connexion — Finora',
  '/inscription': 'Créer un compte — Finora',
  '/dashboard': 'Tableau de bord — Finora',
  '/transactions': 'Transactions — Finora',
  '/transactions/nouvelle': 'Nouvelle transaction — Finora',
  '/categories': 'Catégories — Finora',
  '/budgets': 'Budgets — Finora',
  '/rapports': 'Rapports & Statistiques — Finora',
  '/import-csv': 'Importation CSV — Finora',
  '/parametres': 'Paramètres — Finora',
};

function DocumentTitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = ROUTE_TITLES[pathname] || 'Finora — Personal Finance Management';
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <PreferencesProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <DocumentTitleUpdater />
              <Routes>
                <Route path="/connexion" element={<LoginPage />} />
                <Route path="/inscription" element={<RegisterPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/transactions/nouvelle" element={<AddTransactionPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                    <Route path="/rapports" element={<ReportsPage />} />
                    <Route path="/import-csv" element={<CsvImportPage />} />
                    <Route path="/parametres" element={<SettingsPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </PreferencesProvider>
    </ThemeProvider>
  );
}

export default App;
