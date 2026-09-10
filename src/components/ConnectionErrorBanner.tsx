import React from 'react';
import { AlertTriangle, Database, Sliders, ShieldAlert, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../lib/translations';

interface ConnectionErrorBannerProps {
  error: string;
  language: Language;
  onOpenConfig: () => void;
  onRetry: () => void;
}

export const ConnectionErrorBanner: React.FC<ConnectionErrorBannerProps> = ({
  error,
  language,
  onOpenConfig,
  onRetry
}) => {
  const t = getTranslation(language);

  const isRlsIssue = error.toLowerCase().includes('row-level security') || error.toLowerCase().includes('permission denied') || error.toLowerCase().includes('policy');

  return (
    <div id="db-connection-error-banner" className="bg-rose-950/60 border border-rose-500/50 rounded-2xl p-5 text-rose-100 shadow-lg shadow-rose-950/30 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-rose-900/60 border border-rose-500/30 text-rose-300 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              {t.dbError}
            </h3>
            <p className="text-xs text-rose-200/90 mt-1 leading-relaxed max-w-2xl font-mono bg-rose-950/80 p-2 rounded-lg border border-rose-800/50">
              {error}
            </p>
            {isRlsIssue ? (
              <p className="text-xs text-amber-200 mt-2">
                <strong>RLS Notice:</strong> Make sure your Supabase project has a SELECT policy enabling read access for anon/public users on <code className="font-mono text-white">env_sensor_readings</code> and <code className="font-mono text-white">disaster_alerts</code>.
              </p>
            ) : (
              <p className="text-xs text-slate-300 mt-2">
                {t.dbErrorDesc}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            onClick={onRetry}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {t.refreshBtn}
          </button>
          <button
            onClick={onOpenConfig}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-900/40 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
};
