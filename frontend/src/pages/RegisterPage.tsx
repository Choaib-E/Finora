import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Moon, Sun, User } from 'lucide-react';
import { FinoraLogo } from '../components/FinoraLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage } from '../services/api';

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      showToast('Compte créé avec succès ! Vos catégories par défaut ont été initialisées.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Impossible de créer le compte.');
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
              Créer un compte
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              Finora · Personal Finance Management (MAD)
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
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmed Benali"
                className="fm-input pl-10"
              />
            </div>
          </div>

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
              Mot de passe <span className="opacity-70">(8 caractères min.)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="fm-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="fm-input pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="fm-btn-primary w-full mt-2">
            <span>{submitting ? 'Création...' : 'Créer mon compte'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
          Déjà inscrit ?{' '}
          <Link to="/connexion" className="font-semibold text-[#315CF5] hover:underline dark:text-[#6D8AFF]">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};
