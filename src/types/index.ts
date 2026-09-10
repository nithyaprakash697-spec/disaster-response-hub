export type Language = 'en' | 'ta';

export type RiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export type AlertSeverity = 'critical' | 'warning' | 'normal' | 'info' | 'high' | 'medium' | 'low';

export interface DynamicRecord {
  [key: string]: any;
}

export interface ParsedSensorReading {
  raw: DynamicRecord;
  id: string | number;
  // Water Metrics
  water_level: number | null;
  waterLevel: number | null; // legacy alias
  waterLevelUnit: string;
  ultrasonic_cm: number | null;
  
  // Rain/Soil Metrics
  rain_intensity: number | null;
  rainfall: number | null; // alias for rain_intensity
  rainfallUnit: string;
  soil_moisture_1: number | null;
  soil_moisture_2: number | null;
  soil_moisture_avg: number | null;
  soilMoisture: number | null; // alias for avg
  soilMoistureUnit: string;

  // Weather & Air/Gas Metrics
  temperature: number | null;
  humidity: number | null;
  mq2_gas: number | null;
  air_quality: number | string | null;

  // Stream/Velocity
  flowRate: number | null;
  flowRateUnit: string;

  // Location & Timestamps
  latitude: number | null;
  longitude: number | null;
  timestamp: Date | null;
  timestampRaw: string | null;
  sensorId: string | null;
  sensorName: string | null;
  locationName: string | null;
  
  // Risk & Meta
  riskLevel: RiskLevel;
  extraMetrics: {
    key: string;
    label: string;
    value: any;
    unit?: string;
  }[];
}

export interface ParsedAlert {
  raw: DynamicRecord;
  id: string | number;
  // Exact disaster_alerts table schema:
  device_id: string | null;
  occurred_at: Date | null;
  occurred_at_raw: string | null;
  hazard_type: string;
  severity: AlertSeverity;
  probability: number | null;
  message: string;
  latitude: number | null;
  longitude: number | null;
  resolved: boolean;

  // Legacy & helper aliases:
  title: string | null;
  alertType: string;
  timestamp: Date | null;
  timestampRaw: string | null;
  locationName: string | null;
  status: string | null;
}

export interface RateOfRise {
  ratePerHour: number | null;
  direction: 'rising' | 'falling' | 'stable' | 'unknown';
  unit: string;
  timeSpanMinutes: number;
}

export interface TableSchemaInfo {
  tableName: string;
  columns: string[];
  sampleRowCount: number;
  lastFetchedAt: Date;
  status: 'connected' | 'empty' | 'error' | 'loading';
  errorMessage?: string;
}

export interface SupabaseConnectionState {
  isConfigured: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  realtimeStatus: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | 'CONNECTING' | 'OFFLINE';
  lastLiveEventAt: Date | null;
  url: string;
}
