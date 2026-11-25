import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiErrorMessage, importsApi } from '../services/api';
import type { CsvImportResponse } from '../types';

interface PreviewData {
  headers: string[];
  rows: string[][];
  totalLines: number;
  missingColumns: string[];
}

const REQUIRED_COLUMNS = ['Id', 'date', 'montant', 'categorie', 'type', 'description'];

function parsePreview(text: string): PreviewData {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], totalLines: 0, missingColumns: REQUIRED_COLUMNS };
  }
  const delimiter = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  const rows = lines.slice(1, 9).map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, '')));
  return {
    headers,
    rows,
    totalLines: Math.max(0, lines.length - 1),
    missingColumns,
  };
}

export const CsvImportPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<CsvImportResponse | null>(null);

  const handleSelectFile = async (file: File | null) => {
    setSelectedFile(file);
    setReport(null);
    setProgress(0);
    if (!file) {
      setPreview(null);
      return;
    }
    try {
      const content = await file.text();
      setPreview(parsePreview(content));
    } catch {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      handleSelectFile(file);
    } else if (file) {
      showToast('Veuillez déposer un fichier au format .csv.', 'warning');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Veuillez sélectionner un fichier CSV.', 'warning');
      return;
    }
    setUploading(true);
    setProgress(35);
    const timer = window.setInterval(() => {
      setProgress((p) => (p < 85 ? p + 10 : p));
    }, 200);

    try {
      const res = await importsApi.uploadCsv(selectedFile);
      window.clearInterval(timer);
      setProgress(100);
      setReport(res);
      if (res.error_count === 0) {
        showToast(`${res.imported_count} transaction(s) importée(s) avec succès.`, 'success');
      } else {
        showToast(
          `Importation terminée : ${res.imported_count} importée(s), ${res.error_count} erreur(s).`,
          'warning'
        );
      }
    } catch (err) {
      window.clearInterval(timer);
      setProgress(0);
      showToast(getApiErrorMessage(err, "Erreur lors de l'importation CSV."), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F8FAFC]">
          Importation CSV
        </h1>
        <p className="mt-0.5 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Importez des transactions vers la collection unique <code className="font-mono">transactions</code> avec conversion <code className="font-mono">Id → _id</code>
        </p>
      </div>

      {/* Sécurité & rôle */}
      <div className="fm-card p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-[#315CF5] dark:text-[#6D8AFF] shrink-0 mt-0.5" />
          <div className="text-sm text-[#64748B] dark:text-[#94A3B8] space-y-1">
            <p>
              Connecté en tant que <strong className="text-[#111827] dark:text-[#F8FAFC]">{user?.name}</strong> (identifiant{' '}
              <code className="rounded bg-[#F5F7FA] px-1.5 py-0.5 font-mono text-xs text-[#111827] dark:bg-[#18243A] dark:text-[#F8FAFC]">
                {user?.Id}
              </code>
              , rôle{' '}
              <strong className="text-[#111827] dark:text-[#F8FAFC]">
                {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur standard'}
              </strong>
              ).
            </p>
            <p className="text-xs">
              {user?.role === 'admin'
                ? 'Droits administrateur actifs : vous pouvez importer des transactions pour tous les utilisateurs existants.'
                : `Par sécurité, seules les lignes portant votre identifiant (${user?.Id}) peuvent être importées.`}
            </p>
          </div>
        </div>
      </div>

      {/* Zone glisser-déposer + Format */}
      <div className="fm-card p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
            Format CSV attendu
          </h2>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0B1120] p-4 text-xs text-slate-200">
{`Id,date,montant,categorie,type,description
U001,2026-01-01,250.50,Alimentation,depense,Courses Carrefour
U002,2026-01-02,150.00,Transport,depense,Taxi
U001,2026-01-03,5000.00,Salaire,revenu,Salaire mensuel`}
          </pre>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? 'border-[#315CF5] bg-[#315CF5]/5 dark:border-[#6D8AFF] dark:bg-[#6D8AFF]/10'
                : 'border-[#E8EDF3] bg-[#F5F7FA]/70 dark:border-slate-700 dark:bg-[#0B1120]/50'
            }`}
          >
            <FileSpreadsheet className="mx-auto h-10 w-10 text-[#315CF5] dark:text-[#6D8AFF] mb-3" />
            <p className="text-sm font-semibold text-[#111827] dark:text-[#F8FAFC]">
              {selectedFile ? selectedFile.name : 'Glissez-déposez votre fichier CSV ici'}
            </p>
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Validation automatique des colonnes, détection des doublons et aperçu avant envoi
            </p>
            <label className="mt-4 inline-flex cursor-pointer fm-btn-secondary">
              <span>Sélectionner un fichier .csv</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#64748B] dark:text-[#94A3B8]">
                <span>Traitement et insertion dans MongoDB...</span>
                <span>{progress} %</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F7FA] dark:bg-[#18243A]">
                <div
                  className="h-full rounded-full bg-[#315CF5] dark:bg-[#6D8AFF] transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Aperçu avant importation */}
          {preview && (
            <div className="space-y-3 rounded-xl border border-[#E8EDF3] p-4 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#111827] dark:text-[#F8FAFC]">
                  Aperçu du fichier ({preview.totalLines} ligne(s) de données détectée(s))
                </span>
                {preview.missingColumns.length > 0 ? (
                  <span className="rounded-full bg-[#E5484D]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#E5484D]">
                    Colonnes manquantes : {preview.missingColumns.join(', ')}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#059669]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                    Structure des colonnes valide
                  </span>
                )}
              </div>

              {preview.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F7FA] text-[#64748B] dark:bg-[#18243A] dark:text-[#94A3B8]">
                      <tr>
                        {preview.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDF3] dark:divide-slate-800">
                      {preview.rows.map((r, ri) => (
                        <tr key={ri}>
                          {preview.headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-2 whitespace-nowrap">
                              {r[ci] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading || (preview?.missingColumns.length ?? 0) > 0}
              className="fm-btn-primary"
            >
              <Upload className="h-4 w-4" />
              <span>{uploading ? 'Importation...' : 'Lancer l’importation'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Rapport d'importation */}
      {report && (
        <div className="fm-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#059669] dark:text-[#34D399]" />
            <h2 className="text-base font-semibold text-[#111827] dark:text-[#F8FAFC]">
              Résultat de l'importation
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[#F5F7FA] p-3.5 dark:bg-[#18243A]">
              <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Lignes lues</span>
              <p className="mt-1 text-xl font-bold tabular-nums">{report.total_rows}</p>
            </div>
            <div className="rounded-xl bg-[#059669]/10 p-3.5">
              <span className="text-xs text-[#059669] dark:text-[#34D399]">Importées</span>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#059669] dark:text-[#34D399]">
                {report.imported_count}
              </p>
            </div>
            <div className="rounded-xl bg-[#F59E0B]/10 p-3.5">
              <span className="text-xs text-amber-700 dark:text-[#F59E0B]">Doublons ignorés</span>
              <p className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-[#F59E0B]">
                {report.duplicates_skipped}
              </p>
            </div>
            <div className="rounded-xl bg-[#E5484D]/10 p-3.5">
              <span className="text-xs text-[#E5484D] dark:text-[#FB7185]">Erreurs</span>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#E5484D] dark:text-[#FB7185]">
                {report.error_count}
              </p>
            </div>
          </div>

          {report.summary_by_user.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-2">
                Répartition par utilisateur
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.summary_by_user.map((item) => (
                  <span
                    key={item.user_code}
                    className="rounded-lg border border-[#E8EDF3] bg-[#F5F7FA] px-3 py-1 text-xs font-medium dark:border-slate-700 dark:bg-[#18243A]"
                  >
                    {item.user_code} : <strong>{item.imported_count}</strong> transaction(s)
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.errors.length > 0 && (
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E5484D] dark:text-[#FB7185] mb-2">
                <AlertCircle className="h-4 w-4" />
                Liste des erreurs ({report.errors.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-[#E5484D]/30">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E5484D]/10 text-[#E5484D] dark:text-[#FB7185]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Ligne</th>
                      <th className="px-4 py-2.5 font-medium">Contenu</th>
                      <th className="px-4 py-2.5 font-medium">Erreur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF3] dark:divide-slate-800">
                    {report.errors.map((errItem, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-mono font-semibold">{errItem.row_number}</td>
                        <td className="px-4 py-2.5 font-mono text-[#64748B] max-w-xs truncate">
                          {errItem.raw_data}
                        </td>
                        <td className="px-4 py-2.5 text-[#E5484D] dark:text-[#FB7185]">
                          {errItem.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
