import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Info, 
  Search, 
  Code, 
  Check, 
  Download, 
  Cpu, 
  Percent, 
  Flame, 
  Waves, 
  Wind, 
  Zap, 
  Radio,
  CheckCircle,
  RotateCcw,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { Language, ParsedAlert, AlertSeverity } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';
import { exportAlertsToCsv } from '../lib/csvExport';

interface AlertPanelProps {
  alerts: ParsedAlert[];
  isLoading?: boolean;
  language: Language;
  onOpenSchema?: () => void;
  onResolveAlert?: (id: string | number, currentResolved: boolean) => void;
  onLocateOnMap?: (lat: number, lng: number) => void;
  compactMode?: boolean;
}

type StatusFilter = 'active' | 'resolved' | 'all';
type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  isLoading = false,
  language,
  onOpenSchema,
  onResolveAlert,
  onLocateOnMap,
  compactMode = false
}) => {
  const t = getTranslation(language);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<ParsedAlert | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Filter alerts by status, severity, and search
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      // Status filter
      if (statusFilter === 'active' && alert.resolved) return false;
      if (statusFilter === 'resolved' && !alert.resolved) return false;

      // Severity filter
      if (severityFilter === 'critical' && alert.severity !== 'critical') return false;
      if (severityFilter === 'warning' && alert.severity !== 'warning') return false;
      if (severityFilter === 'info' && (alert.severity === 'critical' || alert.severity === 'warning')) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchMsg = alert.message.toLowerCase().includes(query);
        const matchType = (alert.hazard_type || alert.alertType || '').toLowerCase().includes(query);
        const matchDevice = (alert.device_id || '').toLowerCase().includes(query);
        const matchLoc = (alert.locationName || '').toLowerCase().includes(query);
        if (!matchMsg && !matchType && !matchDevice && !matchLoc) return false;
      }

      return true;
    });
  }, [alerts, statusFilter, severityFilter, searchTerm]);

  const activeCount = useMemo(() => alerts.filter(a => !a.resolved).length, [alerts]);
  const resolvedCount = useMemo(() => alerts.filter(a => a.resolved).length, [alerts]);
  const criticalActiveCount = useMemo(() => alerts.filter(a => !a.resolved && a.severity === 'critical').length, [alerts]);

  const handleExportAlertsCsv = () => {
    const toExport = filteredAlerts.length > 0 ? filteredAlerts : alerts;
    if (toExport.length === 0) return;

    const prefix = `disaster_alerts_${statusFilter}`;
    const success = exportAlertsToCsv(toExport, prefix);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    }
  };

  const handleCopyJson = (alert: ParsedAlert) => {
    navigator.clipboard.writeText(JSON.stringify(alert.raw, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine hazard icon based on hazard_type
  const getHazardIcon = (hazardType: string) => {
    const lower = (hazardType || '').toLowerCase();
    if (lower.includes('flood') || lower.includes('water') || lower.includes('overflow')) {
      return Waves;
    }
    if (lower.includes('fire') || lower.includes('gas') || lower.includes('smoke')) {
      return Flame;
    }
    if (lower.includes('storm') || lower.includes('wind') || lower.includes('cyclone')) {
      return Wind;
    }
    if (lower.includes('lightning') || lower.includes('power')) {
      return Zap;
    }
    return ShieldAlert;
  };

  const getSeverityStyle = (severity: AlertSeverity, isResolved: boolean) => {
    if (isResolved) {
      return {
        cardBorder: 'border-slate-800 bg-slate-900/40 opacity-75',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        iconColor: 'text-slate-500',
        probColor: 'text-slate-400',
        accentBar: 'bg-slate-700'
      };
    }
    switch (severity) {
      case 'critical':
        return {
          cardBorder: 'border-rose-500/40 bg-rose-950/20 shadow-md shadow-rose-950/20',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold',
          iconColor: 'text-rose-400',
          probColor: 'text-rose-300 font-bold',
          accentBar: 'bg-rose-500'
        };
      case 'warning':
        return {
          cardBorder: 'border-amber-500/40 bg-amber-950/15',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold',
          iconColor: 'text-amber-400',
          probColor: 'text-amber-300 font-semibold',
          accentBar: 'bg-amber-500'
        };
      case 'normal':
      case 'info':
      default:
        return {
          cardBorder: 'border-slate-800 bg-slate-900/70',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          iconColor: 'text-emerald-400',
          probColor: 'text-emerald-300',
          accentBar: 'bg-emerald-500'
        };
    }
  };

  return (
    <div id="disaster-alerts-panel" className="space-y-4">
      {/* Component Header with Quick Status Pill Tabs & Actions */}
      <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>{t.alertsTitle}</span>
            </h2>
            {criticalActiveCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                {criticalActiveCount} CRITICAL
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed directly mirroring table <code className="font-mono text-rose-400 font-semibold">disaster_alerts</code>
          </p>
        </div>

        {/* Action Toolbar: Filter Pills & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Switcher */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Active</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === 'active' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {activeCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'resolved'
                  ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Resolved</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {resolvedCount}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({alerts.length})
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            id="export-alerts-csv-btn"
            onClick={handleExportAlertsCsv}
            disabled={filteredAlerts.length === 0}
            title={language === 'ta' ? 'எச்சரிக்கைகளை CSV ஆக பதிவிறக்கு' : `Export ${filteredAlerts.length} alert records as CSV`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              exportSuccess
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : filteredAlerts.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm active:scale-95'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                <span>{t.exported}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Severity Filter Bar */}
      {!compactMode && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by hazard, device_id, or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Severity:</span>
            </span>
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                severityFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSeverityFilter('critical')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                severityFilter === 'critical' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setSeverityFilter('warning')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                severityFilter === 'warning' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              Warning
            </button>
          </div>
        </div>
      )}

      {/* Alerts Feed List or Zero Data State */}
      {alerts.length === 0 ? (
        <div id="no-alerts-state" className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white mb-1">
            {t.noAlertsTitle}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No active threat events recorded in database table <code className="font-mono text-rose-400">disaster_alerts</code>.
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
          No alert records match the selected filter (status: <strong className="text-slate-300">{statusFilter}</strong>, severity: <strong className="text-slate-300">{severityFilter}</strong>).
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert, idx) => {
            const styles = getSeverityStyle(alert.severity, alert.resolved);
            const HazardIcon = getHazardIcon(alert.hazard_type || alert.alertType);

            return (
              <div
                key={alert.id || idx}
                id={`alert-card-${alert.id}`}
                className={`border rounded-2xl p-4 sm:p-5 transition-all relative overflow-hidden group ${styles.cardBorder}`}
              >
                {/* Left vertical accent line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${styles.accentBar}`} />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pl-1">
                  {/* Left Column: Icon + Hazard + Badges + Message */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl bg-slate-950/70 border border-current/20 shrink-0 ${styles.iconColor}`}>
                      <HazardIcon className={`w-5 h-5 ${!alert.resolved && alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Row 1: Hazard Type, Device ID, Severity, Probability, Resolved */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Hazard Type */}
                        <span className="text-xs font-bold font-mono tracking-wide text-white uppercase px-2 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-1">
                          <HazardIcon className="w-3 h-3 text-cyan-400" />
                          <span>{alert.hazard_type || alert.alertType || 'HAZARD'}</span>
                        </span>

                        {/* 2. Device ID badge */}
                        {alert.device_id && (
                          <span className="text-[11px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30 flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-cyan-400" />
                            <span>{alert.device_id}</span>
                          </span>
                        )}

                        {/* 3. Severity Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles.badge}`}>
                          {alert.severity.toUpperCase()}
                        </span>

                        {/* 4. Probability % Badge */}
                        {alert.probability !== null && (
                          <span className={`text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-1 ${styles.probColor}`}>
                            <Percent className="w-3 h-3" />
                            <span>Risk: <strong>{alert.probability}%</strong></span>
                          </span>
                        )}

                        {/* 5. Resolved status indicator */}
                        {alert.resolved ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>RESOLVED</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30">
                            UNRESOLVED
                          </span>
                        )}
                      </div>

                      {/* Row 2: Main Description Message */}
                      <p className="text-sm font-medium text-slate-100 leading-relaxed break-words">
                        {alert.message}
                      </p>

                      {/* Row 3: Occurred At Timestamp + Coordinates */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        {/* Occurrence Time */}
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>
                            {alert.occurred_at
                              ? new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                }).format(alert.occurred_at)
                              : (alert.occurred_at_raw || '—')}
                          </span>
                          <span className="text-slate-500 font-sans">
                            ({formatRelativeTime(alert.occurred_at, language)})
                          </span>
                        </div>

                        {/* Latitude & Longitude / Map Locate */}
                        {alert.latitude !== null && alert.longitude !== null && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-sky-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>
                              {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                            </span>
                            {onLocateOnMap && (
                              <button
                                onClick={() => onLocateOnMap(alert.latitude!, alert.longitude!)}
                                title="Locate coordinate on map"
                                className="text-cyan-400 hover:text-cyan-200 ml-1 inline-flex items-center"
                              >
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions (Resolve Toggle + View Raw JSON) */}
                  <div className="flex items-center sm:flex-col gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                    {/* Resolve status toggle button */}
                    {onResolveAlert && (
                      <button
                        onClick={() => onResolveAlert(alert.id, alert.resolved)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ${
                          alert.resolved
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            : 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        }`}
                      >
                        {alert.resolved ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-slate-400" />
                            <span>Re-open</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>Mark Resolved</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* View Raw Payload */}
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1 font-mono"
                    >
                      <Code className="w-3 h-3 text-cyan-400" />
                      <span>Raw</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Alert JSON Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Raw Record (Table: <span className="font-mono text-cyan-400">disaster_alerts</span>)
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-300">
              <pre>{JSON.stringify(selectedAlert.raw, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                Record ID: {String(selectedAlert.id)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(selectedAlert)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
