import React from 'react';
import { 
  Activity, 
  RefreshCw, 
  Languages, 
  Database, 
  Radio, 
  ShieldAlert, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Language, SupabaseConnectionState } from '../types';
import { getTranslation } from '../lib/translations';
import { NotificationDropdown } from './NotificationDropdown';
import { SystemNotification } from '../lib/notificationEngine';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  connectionState: SupabaseConnectionState;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConfig: () => void;
  onOpenSchema: () => void;
  activeTab: string;
  notifications?: SystemNotification[];
  readNotificationIds?: Set<string>;
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearAllNotifications?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSelectCoordinate?: (coord: { lat: number; lng: number }) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  connectionState,
  onRefresh,
  isRefreshing,
  onOpenConfig,
  onOpenSchema,
  notifications = [],
  readNotificationIds = new Set(),
  onMarkNotificationAsRead = () => {},
  onMarkAllNotificationsAsRead = () => {},
  onClearAllNotifications = () => {},
  soundEnabled = true,
  onToggleSound = () => {},
  onSelectCoordinate,
  onNavigateToTab,
}) => {
  const t = getTranslation(language);

  return (
    <header id="main-header" className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shrink-0">
            <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {t.appTitle}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                ESP32 + Supabase
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Realtime Status Pill */}
          <div 
            id="realtime-status-badge"
            title={connectionState.realtimeStatus}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              connectionState.realtimeStatus === 'SUBSCRIBED'
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : connectionState.realtimeStatus === 'CONNECTING'
                ? 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {connectionState.realtimeStatus === 'SUBSCRIBED' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                connectionState.realtimeStatus === 'SUBSCRIBED' 
                  ? 'bg-emerald-400' 
                  : connectionState.realtimeStatus === 'CONNECTING'
                  ? 'bg-amber-400'
                  : 'bg-slate-500'
              }`}></span>
            </span>
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">
              {connectionState.realtimeStatus === 'SUBSCRIBED' 
                ? t.realtimeConnected 
                : connectionState.realtimeStatus === 'CONNECTING'
                ? t.realtimeConnecting
                : t.realtimeDisconnected}
            </span>
          </div>

          {/* Database Connection Pill */}
          <button
            id="db-connection-pill-btn"
            onClick={onOpenConfig}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors hover:brightness-110 ${
              connectionState.isConnected
                ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300'
                : connectionState.isLoading
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
            }`}
          >
            {connectionState.isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <Database className="w-3 h-3 opacity-75" />
            <span className="max-w-[120px] truncate">
              {connectionState.isConnected ? 'Supabase OK' : 'DB Setup'}
            </span>
          </button>

          {/* System Notifications Dropdown */}
          <NotificationDropdown
            notifications={notifications}
            readIds={readNotificationIds}
            onMarkAsRead={onMarkNotificationAsRead}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
            onClearAll={onClearAllNotifications}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            language={language}
            onSelectCoordinate={onSelectCoordinate}
            onNavigateToTab={onNavigateToTab}
          />

          {/* Schema Inspector Button */}
          <button
            id="schema-inspector-btn"
            onClick={onOpenSchema}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Inspect detected columns and raw database schema"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{t.navSchema}</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5">
            <button
              id="lang-btn-en"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'en'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              id="lang-btn-ta"
              onClick={() => onLanguageChange('ta')}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                language === 'ta'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* Refresh Data Button */}
          <button
            id="refresh-data-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title={t.refreshBtn}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.refreshBtn}</span>
          </button>

          {/* Settings / Config Button */}
          <button
            id="config-settings-btn"
            onClick={onOpenConfig}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            title={t.navSettings}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
