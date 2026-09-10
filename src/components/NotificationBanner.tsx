import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Waves, 
  Flame, 
  CloudRain, 
  MapPin, 
  X, 
  ArrowRight,
  Radio
} from 'lucide-react';
import { SystemNotification } from '../lib/notificationEngine';
import { Language } from '../types';

interface NotificationBannerProps {
  notifications: SystemNotification[];
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onLocateOnMap?: (coord: { lat: number; lng: number }) => void;
  onNavigateToTab?: (tab: string) => void;
  language: Language;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  readIds,
  onMarkAsRead,
  onLocateOnMap,
  onNavigateToTab,
  language,
}) => {
  // Find top unread critical or warning notification
  const unreadAlerts = notifications.filter(n => !readIds.has(n.id));
  if (unreadAlerts.length === 0) return null;

  // Prioritize critical alerts first, then most recent
  const topAlert = unreadAlerts.find(n => n.severity === 'critical') || unreadAlerts[0];
  if (!topAlert) return null;

  const isCritical = topAlert.severity === 'critical';
  const hasCoords = topAlert.latitude !== null && topAlert.longitude !== null && !isNaN(topAlert.latitude!) && !isNaN(topAlert.longitude!);

  const handleLocate = () => {
    if (hasCoords) {
      onLocateOnMap?.({ lat: topAlert.latitude!, lng: topAlert.longitude! });
      onNavigateToTab?.('map');
    }
  };

  return (
    <div 
      id="top-urgent-notification-banner"
      className={`rounded-2xl p-4 border shadow-lg backdrop-blur-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
        isCritical 
          ? 'bg-rose-950/70 border-rose-500/50 shadow-rose-950/30 text-rose-100' 
          : 'bg-amber-950/70 border-amber-500/50 shadow-amber-950/30 text-amber-100'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
          isCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-amber-600 text-white'
        }`}>
          {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isCritical ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {isCritical ? 'URGENT NOTIFICATION' : 'ENVIRONMENTAL ADVISORY'}
            </span>
            <span className="text-xs font-bold text-white truncate">
              {topAlert.title}
            </span>
            {unreadAlerts.length > 1 && (
              <span className="text-[11px] opacity-80 font-mono">
                (+{unreadAlerts.length - 1} more unread)
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm font-medium opacity-95 leading-relaxed break-words">
            {topAlert.message}
          </p>

          {topAlert.metricValue && (
            <div className="text-[11px] font-mono opacity-85">
              Metric: <span className="font-bold text-white">{topAlert.metricLabel} = {topAlert.metricValue}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {hasCoords && (
          <button
            onClick={handleLocate}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
              isCritical
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locate on Map</span>
          </button>
        )}

        <button
          onClick={() => onMarkAsRead(topAlert.id)}
          className="p-1.5 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
