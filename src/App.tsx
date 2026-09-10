/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Language, 
  ParsedSensorReading, 
  ParsedAlert, 
  RateOfRise, 
  RiskLevel,
  SupabaseConnectionState,
  DynamicRecord 
} from './types';
import { 
  fetchEnvSensorReadings, 
  fetchDisasterAlerts, 
  subscribeToTable, 
  getInitialSupabaseCredentials,
  getSupabase,
  updateAlertResolvedStatus
} from './lib/supabaseClient';
import { 
  parseSensorReading, 
  parseAlert, 
  calculateRateOfRise 
} from './lib/dataParser';
import { 
  generateDataDrivenNotifications, 
  playAlertChime, 
  SystemNotification 
} from './lib/notificationEngine';
import { getTranslation } from './lib/translations';
import { Header } from './components/Header';
import { TabSwitcher } from './components/TabSwitcher';
import { NotificationBanner } from './components/NotificationBanner';
import { RiskStatusBanner } from './components/RiskStatusBanner';
import { OverviewCards } from './components/OverviewCards';
import { LiveSensorData } from './components/LiveSensorData';
import { WaterLevelChart } from './components/WaterLevelChart';
import { AlertPanel } from './components/AlertPanel';
import { MonitoringMap } from './components/MonitoringMap';
import { SchemaInspectorModal } from './components/SchemaInspectorModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { ConnectionErrorBanner } from './components/ConnectionErrorBanner';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Database } from 'lucide-react';

export default function App() {
  // 1. App State
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dmd_lang');
      if (saved === 'ta' || saved === 'en') return saved;
    } catch (e) {}
    return 'en';
  });

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMapCoordinate, setSelectedMapCoordinate] = useState<{ lat: number; lng: number } | null>(null);

  // Sound and Read Notification state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dmd_sound') !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dmd_read_notifs');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set<string>();
  });

  // 2. Data State
  const [rawReadings, setRawReadings] = useState<DynamicRecord[]>([]);
  const [rawAlerts, setRawAlerts] = useState<DynamicRecord[]>([]);
  const [readingsColumns, setReadingsColumns] = useState<string[]>([]);
  const [alertsColumns, setAlertsColumns] = useState<string[]>([]);

  // 3. Connection State
  const [connectionState, setConnectionState] = useState<SupabaseConnectionState>(() => {
    const creds = getInitialSupabaseCredentials();
    return {
      isConfigured: !!(creds.url && creds.key),
      isConnected: false,
      isLoading: true,
      error: null,
      realtimeStatus: 'CONNECTING',
      lastLiveEventAt: null,
      url: creds.url
    };
  });

  // Save language preference
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('dmd_lang', lang);
    } catch (e) {}
  };

  const handleToggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('dmd_sound', String(next));
      } catch (e) {}
      return next;
    });
  };

  // 4. Fetch Data from Supabase
  const loadDatabaseData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);

    const creds = getInitialSupabaseCredentials();
    if (!creds.url || !creds.key) {
      setConnectionState(prev => ({
        ...prev,
        isConfigured: false,
        isConnected: false,
        isLoading: false,
        error: 'Supabase credentials not configured. Please provide SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
        realtimeStatus: 'OFFLINE'
      }));
      if (!silent) setIsRefreshing(false);
      return;
    }

    try {
      const [readingsRes, alertsRes] = await Promise.all([
        fetchEnvSensorReadings(100),
        fetchDisasterAlerts(50),
      ]);

      const hasError = readingsRes.error || alertsRes.error;

      if (hasError) {
        setConnectionState(prev => ({
          ...prev,
          isConfigured: true,
          isConnected: false,
          isLoading: false,
          error: readingsRes.error || alertsRes.error,
          url: creds.url
        }));
      } else {
        setRawReadings(readingsRes.data);
        setReadingsColumns(readingsRes.columns);

        setRawAlerts(alertsRes.data);
        setAlertsColumns(alertsRes.columns);

        setConnectionState(prev => ({
          ...prev,
          isConfigured: true,
          isConnected: true,
          isLoading: false,
          error: null,
          url: creds.url
        }));
      }
    } catch (err: any) {
      setConnectionState(prev => ({
        ...prev,
        isConfigured: true,
        isConnected: false,
        isLoading: false,
        error: err.message || 'Error connecting to database',
        url: creds.url
      }));
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // 5. Supabase Realtime Subscriptions for both tables
  useEffect(() => {
    let readingsChannel: RealtimeChannel | null = null;
    let alertsChannel: RealtimeChannel | null = null;

    const supabase = getSupabase();
    if (!supabase) {
      setConnectionState(prev => ({ ...prev, realtimeStatus: 'OFFLINE' }));
      return;
    }

    // Subscribe to env_sensor_readings
    readingsChannel = subscribeToTable(
      'env_sensor_readings',
      (newRow) => {
        setRawReadings(prev => [newRow, ...prev.filter(r => r.id !== newRow.id)]);
        setConnectionState(prev => ({ ...prev, lastLiveEventAt: new Date() }));
      },
      (updatedRow) => {
        setRawReadings(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
        setConnectionState(prev => ({ ...prev, lastLiveEventAt: new Date() }));
      },
      (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState(prev => ({ ...prev, realtimeStatus: 'SUBSCRIBED' }));
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionState(prev => ({ ...prev, realtimeStatus: 'OFFLINE' }));
        }
      }
    );

    // Subscribe to disaster_alerts
    alertsChannel = subscribeToTable(
      'disaster_alerts',
      (newRow) => {
        setRawAlerts(prev => [newRow, ...prev.filter(a => a.id !== newRow.id)]);
        setConnectionState(prev => ({ ...prev, lastLiveEventAt: new Date() }));
      },
      (updatedRow) => {
        setRawAlerts(prev => prev.map(a => a.id === updatedRow.id ? updatedRow : a));
        setConnectionState(prev => ({ ...prev, lastLiveEventAt: new Date() }));
      }
    );

    return () => {
      if (readingsChannel) readingsChannel.unsubscribe();
      if (alertsChannel) alertsChannel.unsubscribe();
    };
  }, [connectionState.isConnected]);

  // 6. Parsed Sensor Readings & Alerts
  const parsedReadings: ParsedSensorReading[] = useMemo(() => {
    return rawReadings.map((row, index) => parseSensorReading(row, index));
  }, [rawReadings]);

  const parsedAlerts: ParsedAlert[] = useMemo(() => {
    return rawAlerts.map((row, index) => parseAlert(row, index));
  }, [rawAlerts]);

  // 7. Data-Driven Notification Generation strictly from rows
  const notifications: SystemNotification[] = useMemo(() => {
    return generateDataDrivenNotifications(parsedReadings, parsedAlerts, language);
  }, [parsedReadings, parsedAlerts, language]);

  // Trigger audio chime for new critical alerts if enabled
  const prevTopNotificationIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (notifications.length > 0) {
      const topNotif = notifications[0];
      if (topNotif.id !== prevTopNotificationIdRef.current) {
        prevTopNotificationIdRef.current = topNotif.id;
        if (soundEnabled && !readNotificationIds.has(topNotif.id)) {
          playAlertChime(topNotif.severity);
        }
      }
    }
  }, [notifications, soundEnabled, readNotificationIds]);

  const handleMarkNotificationAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('dmd_read_notifs', JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const handleMarkAllNotificationsAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem('dmd_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch (e) {}
  };

  const handleClearAllNotifications = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadNotificationIds(allIds);
    try {
      localStorage.setItem('dmd_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch (e) {}
  };

  // Latest reading & derived analytics
  const latestReading: ParsedSensorReading | null = useMemo(() => {
    if (parsedReadings.length === 0) return null;
    const sorted = [...parsedReadings].sort((a, b) => {
      if (a.timestamp && b.timestamp) return b.timestamp.getTime() - a.timestamp.getTime();
      return 0;
    });
    return sorted[0];
  }, [parsedReadings]);

  const rateOfRise: RateOfRise = useMemo(() => {
    return calculateRateOfRise(parsedReadings);
  }, [parsedReadings]);

  const riskLevel: RiskLevel = useMemo(() => {
    if (latestReading) {
      return latestReading.riskLevel;
    }
    return 'NORMAL';
  }, [latestReading]);

  const activeAlerts = useMemo(() => {
    return parsedAlerts.filter(a => !a.resolved);
  }, [parsedAlerts]);

  const criticalAlertsCount = useMemo(() => {
    return parsedAlerts.filter(a => a.severity === 'critical' && !a.resolved).length;
  }, [parsedAlerts]);

  const geoPointsCount = useMemo(() => {
    const sensorGeo = parsedReadings.filter(r => r.latitude !== null && r.longitude !== null && !isNaN(r.latitude) && !isNaN(r.longitude)).length;
    const alertGeo = parsedAlerts.filter(a => a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)).length;
    return sensorGeo + alertGeo;
  }, [parsedReadings, parsedAlerts]);

  // Handle alert status toggle (resolved <-> unresolved)
  const handleResolveAlert = async (id: string | number, currentResolved: boolean) => {
    const newResolved = !currentResolved;
    // Optimistically update local rawAlerts state
    setRawAlerts(prev => prev.map(a => (a.id === id || a._id === id || String(a.id) === String(id)) ? { ...a, resolved: newResolved } : a));
    
    // Call Supabase update helper
    await updateAlertResolvedStatus(id, newResolved);
  };

  // Handle locate on map navigation
  const handleLocateOnMap = (coord: { lat: number; lng: number } | { lat: number; lng: number } | number, lngParam?: number) => {
    if (typeof coord === 'object' && coord !== null && 'lat' in coord) {
      setSelectedMapCoordinate({ lat: coord.lat, lng: coord.lng });
    } else if (typeof coord === 'number' && typeof lngParam === 'number') {
      setSelectedMapCoordinate({ lat: coord, lng: lngParam });
    }
    setActiveTab('map');
  };

  const t = getTranslation(language);

  return (
    <div id="disaster-dashboard-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Top Brand Header with Notification System */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        connectionState={connectionState}
        onRefresh={() => loadDatabaseData(false)}
        isRefreshing={isRefreshing}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onOpenSchema={() => setIsSchemaModalOpen(true)}
        activeTab={activeTab}
        notifications={notifications}
        readNotificationIds={readNotificationIds}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearAllNotifications={handleClearAllNotifications}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onSelectCoordinate={(coord) => handleLocateOnMap(coord.lat, coord.lng)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* 2. Unified Top-Level Tab Navigation Bar (Rendered ONCE directly underneath Header) */}
      <TabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        language={language}
        unreadAlertCount={activeAlerts.length}
        readingsCount={parsedReadings.length}
        geoPointsCount={geoPointsCount}
        onOpenConfig={() => setIsConfigModalOpen(true)}
      />

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Connection Error Banner if not connected */}
        {connectionState.error && (
          <ConnectionErrorBanner
            error={connectionState.error}
            language={language}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            onRetry={() => loadDatabaseData(false)}
          />
        )}

        {/* Urgent High-Priority Data-Driven Notification Banner */}
        <NotificationBanner
          notifications={notifications}
          readIds={readNotificationIds}
          onMarkAsRead={handleMarkNotificationAsRead}
          onLocateOnMap={(coord) => handleLocateOnMap(coord.lat, coord.lng)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          language={language}
        />

        {/* Primary Top Risk Status Banner */}
        <RiskStatusBanner
          riskLevel={riskLevel}
          latestReading={latestReading}
          rateOfRise={rateOfRise}
          language={language}
          criticalAlertsCount={criticalAlertsCount}
        />

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ACTIVE ALERTS                                           */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 1. Overview KPI Cards */}
            <OverviewCards
              latestReading={latestReading}
              rateOfRise={rateOfRise}
              alerts={parsedAlerts}
              riskLevel={riskLevel}
              language={language}
              isConnected={connectionState.isConnected}
            />

            {/* 2. Dedicated Disaster Alerts Live Feed */}
            <AlertPanel
              alerts={parsedAlerts}
              isLoading={connectionState.isLoading}
              language={language}
              onOpenSchema={() => setIsSchemaModalOpen(true)}
              onResolveAlert={handleResolveAlert}
              onLocateOnMap={(lat, lng) => handleLocateOnMap(lat, lng)}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FLOOD & ENVIRONMENTAL TELEMETRY                                    */}
        {/* ========================================================================= */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Dynamic Recharts Time-Series Chart */}
            <WaterLevelChart
              readings={parsedReadings}
              isLoading={connectionState.isLoading}
              language={language}
              onRefresh={() => loadDatabaseData(false)}
            />

            {/* Comprehensive Live Sensor Telemetry Table with CSV Export */}
            <LiveSensorData
              readings={parsedReadings}
              latestReading={latestReading}
              columns={readingsColumns}
              language={language}
              onOpenSchema={() => setIsSchemaModalOpen(true)}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE MAP & SPATIAL NODES                                           */}
        {/* ========================================================================= */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <MonitoringMap
              readings={parsedReadings}
              alerts={parsedAlerts}
              language={language}
              selectedCoordinate={selectedMapCoordinate}
              fullHeight={true}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DATABASE SCHEMA INSPECTOR                                          */}
        {/* ========================================================================= */}
        {activeTab === 'schema' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <span>{t.schemaInspectorTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {t.schemaInspectorDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Table 1: env_sensor_readings */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-cyan-400">env_sensor_readings</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {rawReadings.length} rows
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">{t.detectedColumns}:</span>
                  {readingsColumns.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {readingsColumns.map(col => (
                        <span key={col} className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-700 text-cyan-300">
                          {col}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No columns detected yet.</span>
                  )}
                </div>
              </div>

              {/* Table 2: disaster_alerts */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-rose-400">disaster_alerts</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {rawAlerts.length} rows
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">{t.detectedColumns}:</span>
                  {alertsColumns.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {alertsColumns.map(col => (
                        <span key={col} className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900 border border-slate-700 text-amber-300">
                          {col}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic">No columns detected yet.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsSchemaModalOpen(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                Open Full Schema & JSON Inspector
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Schema Inspector Modal */}
      <SchemaInspectorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        readingsColumns={readingsColumns}
        alertsColumns={alertsColumns}
        readingsSample={rawReadings[0] || null}
        alertsSample={rawAlerts[0] || null}
        readingsCount={rawReadings.length}
        alertsCount={rawAlerts.length}
        language={language}
        onRefresh={() => loadDatabaseData(false)}
      />

      {/* Supabase Connection Settings Modal */}
      <SupabaseConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        language={language}
        onCredentialsUpdated={() => loadDatabaseData(false)}
      />
    </div>
  );
}
