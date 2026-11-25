import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Moon, Save, Sliders, Smartphone, Sun, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { authApi, getApiErrorMessage } from '../services/api';
import type { DisplayCurrency } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, setUserDirect, logout } = useAuth();
  const { currency, setCurrency, language } = usePreferences();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { canInstallAndroid, canShowIosGuide, isInstalled, promptInstall } = usePwaInstall();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({ name, email });
      setUserDirect(updated);
      showToast('Profil mis à jour avec succès.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Impossible de mettre à jour le profil.'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Mot de passe modifié avec succès.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Erreur lors du changement de mot de passe.'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('Vous êtes déconnecté.', 'info');
    navigate('/connexion');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
          Paramètres
        </h1>
        <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Gérez votre profil, vos préférences d'affichage et la sécurité de votre compte
        </p>
      </div>

      {/* Section 1 : Profil */}
      <section className="fm-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#315CF5]/10 text-[#315CF5] dark:bg-[#6D8AFF]/15 dark:text-[#6D8AFF]">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Profil</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Identité personnelle et informations de connexion
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F5F7FA] p-3.5 dark:bg-[#18243A]">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Identifiant utilisateur</span>
            <p className="mt-0.5 font-mono text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
              {user?.Id}
            </p>
          </div>
          <div className="rounded-xl bg-[#F5F7FA] p-3.5 dark:bg-[#18243A]">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Rôle</span>
            <p className="mt-0.5 text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
              {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Nom
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="fm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fm-input"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={savingProfile} className="fm-btn-primary">
              <Save className="h-4 w-4" />
              <span>{savingProfile ? 'Enregistrement...' : 'Enregistrer le profil'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Section 2 : Préférences */}
      <section className="fm-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#059669]/10 text-[#059669] dark:bg-[#34D399]/15 dark:text-[#34D399]">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Préférences</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Devise, langue et thème d'affichage
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Devise
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value as DisplayCurrency);
                showToast(`Devise d'affichage définie sur ${e.target.value}.`, 'info');
              }}
              className="fm-input"
            >
              <option value="MAD">Dirham marocain (MAD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar US (USD)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Langue
            </label>
            <select value={language} disabled className="fm-input opacity-80">
              <option value="fr">Français</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
              Thème
            </label>
            <button
              type="button"
              onClick={toggleTheme}
              className="fm-btn-secondary w-full justify-between"
            >
              <span>{theme === 'dark' ? 'Mode sombre' : 'Mode clair'}</span>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-[#64748B]" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] p-4 dark:bg-[#18243A]">
          <div className="flex items-start gap-3">
            <Smartphone className="h-5 w-5 text-[#315CF5] dark:text-[#6D8AFF] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
                Application mobile (PWA)
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {isInstalled
                  ? 'Application installée sur cet appareil.'
                  : canShowIosGuide
                  ? 'Sur iOS Safari : appuyez sur Partager puis « Sur l’écran d’accueil ».'
                  : 'Installez Finora sur votre écran d’accueil sans passer par un store.'}
              </p>
            </div>
          </div>
          {canInstallAndroid && (
            <button
              type="button"
              onClick={async () => {
                const ok = await promptInstall();
                if (ok) showToast('Application installée avec succès.', 'success');
              }}
              className="fm-btn-primary shrink-0"
            >
              Installer
            </button>
          )}
        </div>
      </section>

      {/* Section 3 : Sécurité */}
      <section className="fm-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B]">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">Sécurité</h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Modifiez votre mot de passe ou fermez votre session
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="fm-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">
                Nouveau mot de passe (8 caractères min.)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="fm-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E8EDF3] dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/5 px-4 py-2.5 text-sm font-semibold text-[#E5484D] hover:bg-[#E5484D]/10 dark:text-[#FB7185]"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>

            <button type="submit" disabled={savingPassword} className="fm-btn-primary">
              {savingPassword ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
