import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Key, 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  ExternalLink,
  Lock,
  Trash2
} from 'lucide-react';
import { Language, SupabaseConnectionState } from '../types';
import { getTranslation } from '../lib/translations';
import { 
  getInitialSupabaseCredentials, 
  saveCustomCredentials, 
  clearCustomCredentials,
  testSupabaseConnection 
} from '../lib/supabaseClient';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onCredentialsUpdated: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  language,
  onCredentialsUpdated
}) => {
  const t = getTranslation(language);
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
    readingsCount?: number;
    alertsCount?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const creds = getInitialSupabaseCredentials();
      setUrl(creds.url);
      setKey(creds.key);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setTestResult({
        tested: true,
        ok: false,
        message: 'Both Supabase URL and Publishable/Anon key are required.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    saveCustomCredentials(url.trim(), key.trim());

    try {
      const res = await testSupabaseConnection();
      setTestResult({
        tested: true,
        ok: res.ok,
        message: res.message,
        readingsCount: res.readingsTable.count,
        alertsCount: res.alertsTable.count
      });
      onCredentialsUpdated();
    } catch (err: any) {
      setTestResult({
        tested: true,
        ok: false,
        message: err.message || 'Connection failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    clearCustomCredentials();
    const creds = getInitialSupabaseCredentials();
    setUrl(creds.url);
    setKey(creds.key);
    setTestResult(null);
    onCredentialsUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t.configModalTitle}
              </h3>
              <p className="text-xs text-slate-400">
                Direct Supabase Connection Settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Description & Security Banner */}
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.configModalDesc}
          </p>

          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{t.securityNotice}</span>
          </div>
        </div>

        {/* Connection Form */}
        <form onSubmit={handleTestAndSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              {t.supabaseUrlLabel}
            </label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              {t.supabaseKeyLabel}
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Test Connection Output */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs ${
              testResult.ok 
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200' 
                : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                <span>{testResult.ok ? 'Connection Verified' : 'Connection Error'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{testResult.message}</p>
              {testResult.ok && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] flex gap-4 text-emerald-300 font-mono">
                  <span>env_sensor_readings: {testResult.readingsCount} records</span>
                  <span>disaster_alerts: {testResult.alertsCount} records</span>
                </div>
              )}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 py-1.5 px-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              Reset to Defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                {t.close}
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-cyan-900/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t.saveAndTest}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
