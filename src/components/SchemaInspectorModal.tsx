import React, { useState } from 'react';
import { 
  Database, 
  Layers, 
  Code, 
  Check, 
  ShieldCheck, 
  Table, 
  FileText, 
  RefreshCw,
  Info
} from 'lucide-react';
import { Language, DynamicRecord, TableSchemaInfo } from '../types';
import { getTranslation } from '../lib/translations';

interface SchemaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  readingsColumns: string[];
  alertsColumns: string[];
  readingsSample: DynamicRecord | null;
  alertsSample: DynamicRecord | null;
  readingsCount: number;
  alertsCount: number;
  language: Language;
  onRefresh: () => void;
}

export const SchemaInspectorModal: React.FC<SchemaInspectorModalProps> = ({
  isOpen,
  onClose,
  readingsColumns,
  alertsColumns,
  readingsSample,
  alertsSample,
  readingsCount,
  alertsCount,
  language,
  onRefresh
}) => {
  const t = getTranslation(language);
  const [activeTable, setActiveTable] = useState<'env_sensor_readings' | 'disaster_alerts'>('env_sensor_readings');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentColumns = activeTable === 'env_sensor_readings' ? readingsColumns : alertsColumns;
  const currentSample = activeTable === 'env_sensor_readings' ? readingsSample : alertsSample;
  const currentCount = activeTable === 'env_sensor_readings' ? readingsCount : alertsCount;

  const handleCopy = () => {
    if (!currentSample) return;
    navigator.clipboard.writeText(JSON.stringify(currentSample, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {t.schemaInspectorTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {t.schemaInspectorDesc}
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

        {/* Table Selector Tabs */}
        <div className="flex items-center gap-2 mt-4 shrink-0">
          <button
            onClick={() => setActiveTable('env_sensor_readings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTable === 'env_sensor_readings'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>env_sensor_readings</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {readingsCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTable('disaster_alerts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              activeTable === 'disaster_alerts'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>disaster_alerts</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {alertsCount}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Detected Columns Grid */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                {t.detectedColumns} ({currentColumns.length})
              </span>
              <span className="text-[11px] text-slate-400">
                {t.recordsLoaded}: <strong className="text-white">{currentCount}</strong>
              </span>
            </div>

            {currentColumns.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No column metadata loaded yet. Awaiting database connection or table records.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentColumns.map((col) => (
                  <span
                    key={col}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700 text-cyan-300 font-semibold"
                  >
                    {col}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sample Payload */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                {t.samplePayload}
              </span>
              {currentSample && (
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors inline-flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-cyan-400" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {currentSample ? (
              <div className="max-h-60 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-emerald-400">
                <pre>{JSON.stringify(currentSample, null, 2)}</pre>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No records available in <code className="text-slate-300 font-mono">{activeTable}</code> yet.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Read-only inspection. Existing schema untouched.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              {t.refreshBtn}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
