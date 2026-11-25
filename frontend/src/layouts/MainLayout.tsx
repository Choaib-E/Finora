import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Plus,
  Settings,
  Share,
  Smartphone,
  Sun,
  Tags,
  User as UserIcon,
  X,
} from 'lucide-react';
import { FinoraLogo } from '../components/FinoraLogo';
import { Modal } from '../components/Modal';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { dashboardApi } from '../services/api';
import type { Budget, DisplayCurrency } from '../types';

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/categories', label: 'Catégories', icon: Tags },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/rapports', label: 'Rapports', icon: BarChart3 },
  { to: '/import-csv', label: 'Importation CSV', icon: FileSpreadsheet },
];

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency, formatAmount } = usePreferences();
  const { showToast } = useToast();
  const { canInstallAndroid, canShowIosGuide, promptInstall } = usePwaInstall();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [alerts, setAlerts] = useState<Budget[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setNotifOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const now = new Date();
    dashboardApi
      .get({ mois: now.getMonth() + 1, annee: now.getFullYear() })
      .then((res) => setAlerts(res.budgets_alertes))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    showToast('Déconnexion effectuée avec succès.', 'info');
    navigate('/connexion');
  };

  const handlePwaInstall = async () => {
    if (canInstallAndroid) {
      const accepted = await promptInstall();
      if (accepted) {
        showToast('Finora a été installé sur votre appareil.', 'success');
      }
    } else if (canShowIosGuide) {
      setIosGuideOpen(true);
    }
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#111827] dark:bg-[#0B1120] dark:text-[#F8FAFC]">
      <OfflineBanner />

      {/* Sticky Topbar */}
      <header className="sticky top-0 z-40 pt-safe border-b border-[#E8EDF3] bg-white/90 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-[#0B1120]/90">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
          {/* Left: Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group min-h-[44px]">
            <div className="transition-transform duration-200 group-hover:scale-105">
              <FinoraLogo size="md" />
            </div>
            <div className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
                Finora
              </span>
              <span className="hidden xs:block sm:block text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                Personal Finance
              </span>
            </div>
          </Link>

          {/* Center: Horizontal Navigation (Desktop xl) */}
          <nav className="hidden xl:flex items-center gap-1 rounded-2xl border border-[#E8EDF3] bg-[#F5F7FA]/80 p-1 dark:border-slate-800 dark:bg-[#111C2E]/90">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/transactions'}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-[#315CF5] shadow-sm dark:bg-[#18243A] dark:text-[#6D8AFF]'
                        : 'text-[#64748B] hover:text-[#111827] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Tablet Horizontal Navigation (md to xl) */}
          <nav className="hidden md:flex xl:hidden items-center gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/transactions'}
                className={({ isActive }) =>
                  `rounded-xl px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#315CF5]/10 text-[#315CF5] dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]'
                      : 'text-[#64748B] hover:bg-slate-100 hover:text-[#111827] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#F8FAFC]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {(canInstallAndroid || canShowIosGuide) && (
              <button
                onClick={handlePwaInstall}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#315CF5]/30 bg-[#315CF5]/10 px-2.5 text-xs font-semibold text-[#315CF5] hover:bg-[#315CF5]/15 dark:border-[#6D8AFF]/30 dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]"
                title="Installer l'application"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Installer</span>
              </button>
            )}

            {/* Currency Selector (Desktop/Tablet) */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
              aria-label="Sélecteur de devise"
              className="hidden sm:block h-9 rounded-xl border border-[#E8EDF3] bg-white px-2.5 text-xs font-semibold text-[#111827] transition-colors hover:border-slate-300 focus:border-[#315CF5] focus:outline-none dark:border-slate-700/80 dark:bg-[#111C2E] dark:text-[#F8FAFC]"
            >
              <option value="MAD">MAD (DH)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="fm-icon-btn border border-[#E8EDF3] bg-white text-[#64748B] hover:bg-slate-50 hover:text-[#111827] dark:border-slate-700/80 dark:bg-[#111C2E] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#F8FAFC]"
              aria-label="Changer le thème clair/sombre"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Notification Center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                className="fm-icon-btn relative border border-[#E8EDF3] bg-white text-[#64748B] hover:bg-slate-50 hover:text-[#111827] dark:border-slate-700/80 dark:bg-[#111C2E] dark:text-[#94A3B8] dark:hover:bg-[#18243A] dark:hover:text-[#F8FAFC]"
                aria-label="Centre de notifications"
              >
                <Bell className="h-4 w-4" />
                {alerts.length > 0 && (
                  <span className="absolute right-1 top-1 sm:-right-1 sm:-top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-white">
                    {alerts.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[70px] sm:top-auto sm:mt-2 sm:w-80 rounded-2xl border border-[#E8EDF3] bg-white p-4 shadow-xl dark:border-slate-700/80 dark:bg-[#111C2E] z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E8EDF3] dark:border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                      Alertes financières
                    </span>
                    <Link
                      to="/budgets"
                      className="text-xs font-medium text-[#315CF5] hover:underline dark:text-[#6D8AFF]"
                    >
                      Voir budgets
                    </Link>
                  </div>
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <div className="flex items-center gap-2.5 py-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-[#34D399] shrink-0" />
                        <span>Aucune alerte budgétaire pour le mois en cours.</span>
                      </div>
                    ) : (
                      alerts.map((b) => (
                        <Link
                          key={b.id}
                          to="/budgets"
                          className="flex items-start gap-2.5 rounded-xl bg-[#F5F7FA] p-3 text-xs transition-colors hover:bg-slate-100 dark:bg-[#18243A] dark:hover:bg-[#1F2E49]"
                        >
                          <AlertTriangle
                            className={`h-4 w-4 shrink-0 mt-0.5 ${
                              b.alerte_niveau === 'exceeded'
                                ? 'text-[#E5484D] dark:text-[#FB7185]'
                                : 'text-[#F59E0B]'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">
                              {b.categorie} ({b.pourcentage_utilise.toFixed(0)} %)
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              {formatAmount(b.montant_consomme)} / {formatAmount(b.montant_limite)}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative hidden sm:block" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex h-9 items-center gap-2 rounded-xl border border-[#E8EDF3] bg-white py-1 pl-1.5 pr-2.5 text-left transition-colors hover:bg-slate-50 dark:border-slate-700/80 dark:bg-[#111C2E] dark:hover:bg-[#18243A]"
                aria-label="Menu du profil"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#315CF5]/10 text-xs font-bold text-[#315CF5] dark:bg-[#6D8AFF]/20 dark:text-[#6D8AFF]">
                  {initials}
                </div>
                <span className="max-w-[110px] truncate text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  {user?.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#64748B] dark:text-[#94A3B8]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E8EDF3] bg-white p-2 shadow-xl dark:border-slate-700/80 dark:bg-[#111C2E] z-50">
                  <div className="border-b border-[#E8EDF3] px-3 py-2.5 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                        {user?.name}
                      </p>
                      <span className="rounded-md bg-[#315CF5]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#315CF5] dark:bg-[#6D8AFF]/20 dark:text-[#6D8AFF]">
                        {user?.Id}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1.5 space-y-0.5">
                    <Link
                      to="/transactions/nouvelle"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#111827] hover:bg-[#F5F7FA] dark:text-[#F8FAFC] dark:hover:bg-[#18243A]"
                    >
                      <Plus className="h-3.5 w-3.5 text-[#315CF5] dark:text-[#6D8AFF]" />
                      <span>Nouvelle transaction</span>
                    </Link>
                    <Link
                      to="/parametres"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#111827] hover:bg-[#F5F7FA] dark:text-[#F8FAFC] dark:hover:bg-[#18243A]"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#64748B] dark:text-[#94A3B8]" />
                      <span>Paramètres du compte</span>
                    </Link>
                  </div>

                  <div className="border-t border-[#E8EDF3] pt-1.5 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#E5484D] hover:bg-rose-50 dark:text-[#FB7185] dark:hover:bg-rose-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button (44x44px) */}
            <button
              onClick={() => {
                setMobileMenuOpen((o) => !o);
                setNotifOpen(false);
              }}
              className="fm-icon-btn md:hidden border border-[#E8EDF3] bg-white text-[#111827] dark:border-slate-700/80 dark:bg-[#111C2E] dark:text-[#F8FAFC]"
              aria-label="Menu de navigation"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Full Navigation Drawer (Top-down, never a Sidebar) */}
        {mobileMenuOpen && (
          <div className="border-t border-[#E8EDF3] bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-[#111C2E] max-h-[80dvh] overflow-y-auto space-y-4">
            {/* Utilisateur connecté */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F5F7FA] p-3.5 dark:bg-[#18243A]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#315CF5]/15 text-sm font-bold text-[#315CF5] dark:bg-[#6D8AFF]/20 dark:text-[#6D8AFF]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {user?.Id} · {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Toutes les pages accessibles en 1 tap */}
            <nav className="grid grid-cols-2 gap-2">
              {[
                ...navItems,
                { to: '/transactions/nouvelle', label: 'Ajouter', icon: Plus },
                { to: '/parametres', label: 'Paramètres', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/transactions'}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#315CF5]/10 text-[#315CF5] dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]'
                          : 'bg-[#F5F7FA]/70 text-[#111827] dark:bg-[#18243A]/60 dark:text-[#F8FAFC]'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Devise + Installation PWA + Déconnexion */}
            <div className="space-y-2.5 border-t border-[#E8EDF3] pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                  Devise d'affichage
                </span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
                  className="min-h-[44px] rounded-xl border border-[#E8EDF3] bg-[#F5F7FA] px-3 text-xs font-semibold dark:border-slate-700 dark:bg-[#18243A]"
                >
                  <option value="MAD">MAD (DH)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>

              {(canInstallAndroid || canShowIosGuide) && (
                <button
                  onClick={handlePwaInstall}
                  className="fm-btn-secondary w-full text-xs text-[#315CF5] dark:text-[#6D8AFF]"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Installer l'application sur ce téléphone</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/5 px-4 text-xs font-semibold text-[#E5484D] dark:text-[#FB7185]"
              >
                <LogOut className="h-4 w-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content (padding-bottom pour ne jamais masquer le contenu sous la barre mobile) */}
      <main className="flex-1 px-3.5 py-5 pb-28 sm:px-6 md:py-6 md:pb-8 lg:px-8">
        <div key={location.pathname} className="mx-auto max-w-[1440px] animate-page-enter">
          <Outlet />
        </div>
      </main>

      {/* Barre de navigation inférieure Mobile (Smartphone < md) */}
      <nav
        aria-label="Navigation principale mobile"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[#E8EDF3] bg-white/95 backdrop-blur-xl pb-safe dark:border-slate-800 dark:bg-[#0B1120]/95"
      >
        <div className="grid grid-cols-5 items-center px-1 py-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#315CF5] dark:text-[#6D8AFF]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`
            }
          >
            <Home className="h-5 w-5" />
            <span>Accueil</span>
          </NavLink>

          <NavLink
            to="/transactions"
            end
            className={({ isActive }) =>
              `flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#315CF5] dark:text-[#6D8AFF]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`
            }
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span>Transactions</span>
          </NavLink>

          <div className="flex justify-center">
            <Link
              to="/transactions/nouvelle"
              aria-label="Ajouter une transaction"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#315CF5] text-white shadow-lg shadow-[#315CF5]/30 transition-transform active:scale-95 dark:bg-[#6D8AFF] dark:text-[#0B1120]"
            >
              <Plus className="h-6 w-6" />
            </Link>
          </div>

          <NavLink
            to="/budgets"
            className={({ isActive }) =>
              `flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#315CF5] dark:text-[#6D8AFF]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`
            }
          >
            <PiggyBank className="h-5 w-5" />
            <span>Budgets</span>
          </NavLink>

          <NavLink
            to="/parametres"
            className={({ isActive }) =>
              `flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[#315CF5] dark:text-[#6D8AFF]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`
            }
          >
            <UserIcon className="h-5 w-5" />
            <span>Profil</span>
          </NavLink>
        </div>
      </nav>

      {/* Guide d'installation iOS Safari */}
      <Modal
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        title="Installer Finora sur iPhone"
        subtitle="Ajoutez l'application à votre écran d'accueil sans App Store"
      >
        <ol className="space-y-3 text-sm text-[#64748B] dark:text-[#94A3B8]">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#315CF5]/10 text-xs font-bold text-[#315CF5] dark:text-[#6D8AFF]">
              1
            </span>
            <span>
              Appuyez sur l'icône <Share className="inline h-4 w-4 mx-1" /> <strong>Partager</strong> dans la barre de Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#315CF5]/10 text-xs font-bold text-[#315CF5] dark:text-[#6D8AFF]">
              2
            </span>
            <span>
              Sélectionnez <strong>Sur l'écran d'accueil</strong> puis appuyez sur <strong>Ajouter</strong>.
            </span>
          </li>
        </ol>
        <div className="mt-6 flex justify-end">
          <button onClick={() => setIosGuideOpen(false)} className="fm-btn-primary w-full sm:w-auto">
            Compris
          </button>
        </div>
      </Modal>
    </div>
  );
};
