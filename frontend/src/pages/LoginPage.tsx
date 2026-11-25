import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Moon, Sun } from 'lucide-react';
import { FinoraLogo } from '../components/FinoraLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      showToast('Connexion réussie. Bienvenue sur Finora.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Identifiants invalides.');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F7FA] px-4 py-12 pt-safe pb-safe dark:bg-[#0B1120]">
      <button
        onClick={toggleTheme}
        className="fm-icon-btn fixed right-4 top-4 border border-[#E8EDF3] bg-white text-[#64748B] shadow-card dark:border-slate-700/80 dark:bg-[#111C2E] dark:text-[#94A3B8]"
        aria-label="Changer le thème"
      >
        {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="mx-auto w-full max-w-md fm-card p-8 animate-page-enter">
        <div className="flex items-center gap-3 mb-7">
          <FinoraLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
              Finora
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Personal Finance Management · Connexion sécurisée
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-[#E5484D]/30 bg-[#E5484D]/10 px-4 py-3 text-xs font-medium text-[#E5484D] dark:text-[#FB7185]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Adresse email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ahmed@example.com"
                className="fm-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="fm-input pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="fm-btn-primary w-full mt-2">
            <span>{submitting ? 'Connexion...' : 'Se connecter'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
          Nouveau sur Finora ?{' '}
          <Link to="/inscription" className="font-semibold text-[#315CF5] hover:underline dark:text-[#6D8AFF]">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
};
