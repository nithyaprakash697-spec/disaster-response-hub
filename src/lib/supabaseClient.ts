import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { DynamicRecord } from '../types';

const STORAGE_KEY_URL = 'dmd_supabase_url';
const STORAGE_KEY_KEY = 'dmd_supabase_key';

function getEnvVar(key: string): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key] as string;
  }
  return '';
}

export function getInitialSupabaseCredentials(): { url: string; key: string } {
  // Check env vars first
  const envUrl = getEnvVar('SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL');
  const envKey = getEnvVar('SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

  // Check localStorage if not in env
  let localUrl = '';
  let localKey = '';
  try {
    localUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
    localKey = localStorage.getItem(STORAGE_KEY_KEY) || '';
  } catch (e) {
    // Ignore localStorage error
  }

  const finalUrl = (envUrl || localUrl || '').trim();
  const finalKey = (envKey || localKey || '').trim();

  return { url: finalUrl, key: finalKey };
}

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getInitialSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (supabaseInstance && currentUrl === url && currentKey === key) {
    return supabaseInstance;
  }

  try {
    currentUrl = url;
    currentKey = key;
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function saveCustomCredentials(url: string, key: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    currentUrl = '';
    currentKey = '';
    supabaseInstance = null;
    return !!getSupabase();
  } catch (e) {
    console.error('Failed to save Supabase credentials:', e);
    return false;
  }
}

export function clearCustomCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    currentUrl = '';
    currentKey = '';
    supabaseInstance = null;
  } catch (e) {}
}

export interface FetchResult<T> {
  data: T[];
  columns: string[];
  count: number;
  error: string | null;
}

export async function fetchEnvSensorReadings(limit = 100): Promise<FetchResult<DynamicRecord>> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: [],
      columns: [],
      count: 0,
      error: 'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.'
    };
  }

  try {
    // We do NOT assume columns or order keys - we select * and let database return whatever exists
    const { data, error, count } = await supabase
      .from('env_sensor_readings')
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) {
      console.error('Error fetching env_sensor_readings:', error);
      return {
        data: [],
        columns: [],
        count: 0,
        error: error.message || 'Error querying env_sensor_readings'
      };
    }

    const rows = (data || []) as DynamicRecord[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      data: rows,
      columns,
      count: count ?? rows.length,
      error: null
    };
  } catch (err: any) {
    console.error('Exception fetching env_sensor_readings:', err);
    return {
      data: [],
      columns: [],
      count: 0,
      error: err.message || 'Network error connecting to Supabase'
    };
  }
}

export async function fetchDisasterAlerts(limit = 50): Promise<FetchResult<DynamicRecord>> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      data: [],
      columns: [],
      count: 0,
      error: 'Supabase credentials not configured.'
    };
  }

  try {
    const { data, error, count } = await supabase
      .from('disaster_alerts')
      .select('*', { count: 'exact' })
      .limit(limit);

    if (error) {
      console.error('Error fetching disaster_alerts:', error);
      return {
        data: [],
        columns: [],
        count: 0,
        error: error.message || 'Error querying disaster_alerts'
      };
    }

    const rows = (data || []) as DynamicRecord[];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      data: rows,
      columns,
      count: count ?? rows.length,
      error: null
    };
  } catch (err: any) {
    console.error('Exception fetching disaster_alerts:', err);
    return {
      data: [],
      columns: [],
      count: 0,
      error: err.message || 'Network error connecting to Supabase'
    };
  }
}

export function subscribeToTable(
  tableName: 'env_sensor_readings' | 'disaster_alerts',
  onInsert: (payload: DynamicRecord) => void,
  onUpdate?: (payload: DynamicRecord) => void,
  onStatusChange?: (status: string) => void
): RealtimeChannel | null {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const channelName = `realtime_${tableName}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: tableName },
        (payload) => {
          if (payload.new) {
            onInsert(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: tableName },
        (payload) => {
          if (payload.new && onUpdate) {
            onUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (onStatusChange) {
          onStatusChange(status);
        }
      });

    return channel;
  } catch (err) {
    console.error(`Failed to subscribe to ${tableName}:`, err);
    return null;
  }
}

export async function updateAlertResolvedStatus(alertId: string | number, resolved: boolean): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('disaster_alerts')
      .update({ resolved })
      .eq('id', alertId);

    if (error) {
      console.warn('Failed to update alert resolved status in Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Exception updating alert resolved status:', e);
    return false;
  }
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  readingsTable: { exists: boolean; count: number; error?: string };
  alertsTable: { exists: boolean; count: number; error?: string };
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.',
      readingsTable: { exists: false, count: 0, error: 'Not configured' },
      alertsTable: { exists: false, count: 0, error: 'Not configured' }
    };
  }

  const readingsRes = await fetchEnvSensorReadings(1);
  const alertsRes = await fetchDisasterAlerts(1);

  const readingsOk = !readingsRes.error;
  const alertsOk = !alertsRes.error;

  const isOk = readingsOk || alertsOk;

  return {
    ok: isOk,
    message: isOk ? 'Successfully connected to Supabase project.' : `Connection error: ${readingsRes.error || alertsRes.error}`,
    readingsTable: {
      exists: readingsOk,
      count: readingsRes.count,
      error: readingsRes.error || undefined
    },
    alertsTable: {
      exists: alertsOk,
      count: alertsRes.count,
      error: alertsRes.error || undefined
    }
  };
}
