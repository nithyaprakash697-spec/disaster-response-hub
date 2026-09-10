import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  ShieldAlert, 
  Waves, 
  Flame, 
  CloudRain, 
  Volume2, 
  VolumeX, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  MapPin,
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
import { SystemNotification } from '../lib/notificationEngine';
import { Language } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';

interface NotificationDropdownProps {
  notifications: SystemNotification[];
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  language: Language;
  onSelectCoordinate?: (coord: { lat: number; lng: number }) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  soundEnabled,
  onToggleSound,
  language,
  onSelectCoordinate,
  onNavigateToTab,
}) => {
  const t = getTranslation(language);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate unread counts
  const unreadNotifications = notifications.filter(n => !readIds.has(n.id));
  const unreadCount = unreadNotifications.length;
  const criticalUnreadCount = unreadNotifications.filter(n => n.severity === 'critical').length;

  // Filtered list
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'critical') return n.severity === 'critical';
    if (filter === 'warning') return n.severity === 'warning';
    return true;
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIconForNotification = (n: SystemNotification) => {
    if (n.type === 'flood_critical' || n.type === 'flood_warning') {
      return <Waves className="w-4 h-4 text-cyan-400" />;
    }
    if (n.type === 'gas_hazard') {
      return <Flame className="w-4 h-4 text-amber-400" />;
    }
    if (n.type === 'rain_hazard') {
      return <CloudRain className="w-4 h-4 text-sky-400" />;
    }
    if (n.severity === 'critical') {
      return <ShieldAlert className="w-4 h-4 text-rose-400" />;
    }
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const handleLocate = (n: SystemNotification) => {
    if (n.latitude !== null && n.longitude !== null && !isNaN(n.latitude!) && !isNaN(n.longitude!)) {
      onSelectCoordinate?.({ lat: n.latitude!, lng: n.longitude! });
      onNavigateToTab?.('map');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="notifications-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        className={`relative p-2 rounded-xl transition-all border ${
          isOpen
            ? 'bg-slate-800 border-cyan-500/50 text-white'
            : unreadCount > 0
            ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
            : 'bg-slate-800/60 hover:bg-slate-700 text-slate-400 border-slate-700/80'
        }`}
        title={unreadCount > 0 ? `${unreadCount} unread system notifications` : 'System notifications'}
      >
        <Bell className={`w-4 h-4 ${criticalUnreadCount > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-300'}`} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span
            id="notification-badge-count"
            className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-white flex items-center justify-center min-w-[18px] shadow-sm ${
              criticalUnreadCount > 0
                ? 'bg-rose-600 animate-pulse ring-2 ring-slate-950'
                : 'bg-cyan-600 ring-2 ring-slate-950'
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notifications-panel-dropdown"
          className="absolute right-0 sm:right-0 mt-2 w-[340px] sm:w-[420px] max-w-[calc(100vw-32px)] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Notifications
                </h4>
                <p className="text-[11px] text-slate-400">
                  {unreadCount} unread / {notifications.length} total events
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                onClick={onToggleSound}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  soundEnabled
                    ? 'text-cyan-400 hover:bg-cyan-500/10'
                    : 'text-slate-500 hover:bg-slate-800'
                }`}
                title={soundEnabled ? 'Alert audio chime enabled (Click to mute)' : 'Alert audio muted (Click to enable)'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1 transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                  <span>Mark Read</span>
                </button>
              )}

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  filter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('critical')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  filter === 'critical' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Critical ({notifications.filter(n => n.severity === 'critical').length})
              </button>
              <button
                onClick={() => setFilter('warning')}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                  filter === 'warning' ? 'bg-amber-950 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Warning ({notifications.filter(n => n.severity === 'warning').length})
              </button>
            </div>

            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Clear all alerts from view"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/80 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCheck className="w-8 h-8 mx-auto text-emerald-400/60" />
                <p className="text-xs font-semibold text-slate-300">
                  {filter === 'all' ? 'No active notifications' : `No ${filter} notifications`}
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  All environmental telemetry sensors are within normal thresholds and no active disaster alerts exist.
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isRead = readIds.has(n.id);
                const hasCoords = n.latitude !== null && n.longitude !== null && !isNaN(n.latitude!) && !isNaN(n.longitude!);

                return (
                  <div
                    key={n.id}
                    onClick={() => onMarkAsRead(n.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 group relative ${
                      isRead ? 'bg-slate-900/40 opacity-70 hover:opacity-100 hover:bg-slate-800/50' : 'bg-slate-900/90 hover:bg-slate-800/80'
                    }`}
                  >
                    {/* Unread Pill indicator */}
                    {!isRead && (
                      <span className="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-cyan-500/20" />
                    )}

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${
                      n.severity === 'critical'
                        ? 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                        : n.severity === 'warning'
                        ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                        : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
                    }`}>
                      {getIconForNotification(n)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <h5 className={`text-xs font-bold truncate ${
                          n.severity === 'critical' ? 'text-rose-300' : n.severity === 'warning' ? 'text-amber-300' : 'text-slate-200'
                        }`}>
                          {n.title}
                        </h5>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(n.timestamp, language)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed break-words font-medium">
                        {n.message}
                      </p>

                      {/* Metadata Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {n.source === 'disaster_alert' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            disaster_alerts
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            env_sensor_readings
                          </span>
                        )}

                        {n.deviceId && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            ID: {n.deviceId}
                          </span>
                        )}

                        {n.metricValue && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                            {n.metricLabel}: {n.metricValue}
                          </span>
                        )}

                        {/* Quick locate on map button */}
                        {hasCoords && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLocate(n);
                            }}
                            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 transition-colors"
                            title={`Pan to GPS: ${n.latitude?.toFixed(4)}, ${n.longitude?.toFixed(4)}`}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Locate Pin</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-[10px] font-mono">
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
                <span>Live Supabase Engine</span>
              </span>
              <button
                onClick={() => {
                  onNavigateToTab?.('overview');
                  setIsOpen(false);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                <span>View Full Alert Feed</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
