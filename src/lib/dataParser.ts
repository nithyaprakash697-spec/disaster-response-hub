import { DynamicRecord, ParsedSensorReading, ParsedAlert, RiskLevel, AlertSeverity, RateOfRise } from '../types';

const WATER_LEVEL_KEYS = [
  'water_level',
  'waterlevel',
  'water_level_m',
  'water_level_cm',
  'waterlevelm',
  'waterlevelcm',
  'level',
  'water_height',
  'water_depth',
  'waterdepth',
  'waterlevel_value',
  'water_reading',
  'depth',
  'distance_to_water',
  'water',
  'reading',
  'value',
  'val'
];

const RAINFALL_KEYS = [
  'rainfall',
  'rain',
  'rain_gauge',
  'rainfall_rate',
  'rain_rate',
  'precipitation',
  'rainfall_mm',
  'rain_mm',
  'rain_gauge_mm',
  'precip',
  'hourly_rain',
  'precipitation_rate'
];

const FLOW_RATE_KEYS = [
  'flow_rate',
  'flowrate',
  'water_flow',
  'flow',
  'discharge',
  'water_velocity',
  'velocity',
  'current_speed',
  'flow_speed'
];

const SOIL_MOISTURE_KEYS = [
  'soil_moisture',
  'soilmoisture',
  'moisture',
  'soil_humidity',
  'soil_saturation',
  'soil_moist',
  'ground_moisture',
  'saturation'
];

const TIMESTAMP_KEYS = [
  'created_at',
  'timestamp',
  'recorded_at',
  'reading_time',
  'sensor_time',
  'time',
  'datetime',
  'date',
  'updated_at',
  'inserted_at',
  'ts'
];

const SENSOR_ID_KEYS = [
  'sensor_id',
  'device_id',
  'node_id',
  'station_id',
  'sensor_name',
  'device_name',
  'device',
  'sensor',
  'node',
  'source',
  'station',
  'esp32_id',
  'esp_id',
  'hardware_id',
  'mac_address'
];

const LOCATION_NAME_KEYS = [
  'location',
  'location_name',
  'site',
  'site_name',
  'area',
  'place',
  'zone',
  'station_location',
  'river_name',
  'point_name',
  'address'
];

const LATITUDE_KEYS = ['latitude', 'lat', 'lat_deg', 'coord_lat', 'y'];
const LONGITUDE_KEYS = ['longitude', 'longitude_deg', 'lng', 'lon', 'long', 'coord_lng', 'coord_lon', 'x'];

const RISK_KEYS = [
  'risk',
  'risk_level',
  'severity',
  'threat_level',
  'alert_level',
  'status',
  'condition',
  'state'
];

const ALERT_MESSAGE_KEYS = [
  'message',
  'alert_message',
  'description',
  'details',
  'text',
  'content',
  'summary',
  'body',
  'info'
];

const ALERT_TYPE_KEYS = [
  'alert_type',
  'type',
  'event_type',
  'hazard_type',
  'category',
  'event',
  'name'
];

function findKeyCaseInsensitive(record: DynamicRecord, candidates: string[]): string | undefined {
  const recordKeys = Object.keys(record);
  for (const candidate of candidates) {
    const matched = recordKeys.find(k => k.toLowerCase() === candidate.toLowerCase() || k.toLowerCase().replace(/[-_]/g, '') === candidate.toLowerCase().replace(/[-_]/g, ''));
    if (matched && record[matched] !== undefined && record[matched] !== null) {
      return matched;
    }
  }
  return undefined;
}

function parseNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseDateValue(val: any): { date: Date | null; raw: string | null } {
  if (!val) return { date: null, raw: null };
  const rawStr = String(val);
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed, raw: rawStr };
  }
  return { date: null, raw: rawStr };
}

function normalizeRiskLevel(val: any): RiskLevel {
  if (!val) return 'NORMAL';
  const str = String(val).toUpperCase().trim();
  if (str.includes('CRIT') || str.includes('DANGER') || str.includes('HIGH') || str.includes('SEVERE') || str === '3') {
    return 'CRITICAL';
  }
  if (str.includes('WARN') || str.includes('MODERATE') || str.includes('MEDIUM') || str.includes('ELEVATED') || str === '2') {
    return 'WARNING';
  }
  if (str.includes('NORM') || str.includes('SAFE') || str.includes('LOW') || str.includes('OK') || str === '1' || str === '0') {
    return 'NORMAL';
  }
  return 'NORMAL';
}

function normalizeAlertSeverity(val: any): AlertSeverity {
  if (!val) return 'normal';
  const str = String(val).toLowerCase().trim();
  if (str.includes('crit') || str.includes('danger') || str.includes('severe') || str.includes('high') || str === '3') {
    return 'critical';
  }
  if (str.includes('warn') || str.includes('mod') || str.includes('med') || str.includes('elevated') || str === '2') {
    return 'warning';
  }
  return 'normal';
}

export function parseSensorReading(row: DynamicRecord, index: number = 0): ParsedSensorReading {
  if (!row || typeof row !== 'object') {
    return {
      raw: {},
      id: index,
      water_level: null,
      waterLevel: null,
      waterLevelUnit: 'cm',
      ultrasonic_cm: null,
      rain_intensity: null,
      rainfall: null,
      rainfallUnit: 'mm/hr',
      soil_moisture_1: null,
      soil_moisture_2: null,
      soil_moisture_avg: null,
      soilMoisture: null,
      soilMoistureUnit: '%',
      temperature: null,
      humidity: null,
      mq2_gas: null,
      air_quality: null,
      flowRate: null,
      flowRateUnit: 'm/s',
      timestamp: null,
      timestampRaw: null,
      sensorId: null,
      sensorName: null,
      locationName: null,
      latitude: null,
      longitude: null,
      riskLevel: 'NORMAL',
      extraMetrics: []
    };
  }

  // 1. ID
  const id = row.id ?? row._id ?? row.uuid ?? `reading-${index}`;

  // 2. Exact Database Columns - Water Metrics
  const waterLevelRaw = row.water_level !== undefined ? row.water_level : row.waterlevel !== undefined ? row.waterlevel : undefined;
  const waterKey = waterLevelRaw !== undefined ? 'water_level' : findKeyCaseInsensitive(row, WATER_LEVEL_KEYS);
  let waterLevel: number | null = waterLevelRaw !== undefined ? parseNumericValue(waterLevelRaw) : (waterKey ? parseNumericValue(row[waterKey]) : null);
  let waterLevelUnit = 'cm'; // default to cm for typical flood/ultrasonic IoT systems

  if (waterKey) {
    if (waterKey.toLowerCase().includes('_m') || waterKey.toLowerCase().endsWith('m') || (waterLevel !== null && waterLevel > 0 && waterLevel < 10 && !waterKey.toLowerCase().includes('cm'))) {
      if (waterKey.toLowerCase().includes('_cm') || waterKey.toLowerCase().endsWith('cm')) {
        waterLevelUnit = 'cm';
      } else {
        waterLevelUnit = 'm';
      }
    }
  }

  const ultrasonicRaw = row.ultrasonic_cm !== undefined ? row.ultrasonic_cm : (row.ultrasonic !== undefined ? row.ultrasonic : (row.distance_cm !== undefined ? row.distance_cm : undefined));
  const ultrasonic_cm = ultrasonicRaw !== undefined ? parseNumericValue(ultrasonicRaw) : null;

  // 3. Rain / Precipitation Metrics (rain_intensity)
  const rainRaw = row.rain_intensity !== undefined ? row.rain_intensity : (row.rain !== undefined ? row.rain : (row.rainfall !== undefined ? row.rainfall : undefined));
  const rainKey = rainRaw !== undefined ? 'rain_intensity' : findKeyCaseInsensitive(row, RAINFALL_KEYS);
  const rain_intensity = rainRaw !== undefined ? parseNumericValue(rainRaw) : (rainKey ? parseNumericValue(row[rainKey]) : null);
  let rainfallUnit = 'mm/hr';

  // 4. Soil Moisture Metrics (soil_moisture_1, soil_moisture_2)
  const sm1Raw = row.soil_moisture_1 !== undefined ? row.soil_moisture_1 : (row.soil_moisture1 !== undefined ? row.soil_moisture1 : undefined);
  const soil_moisture_1 = sm1Raw !== undefined ? parseNumericValue(sm1Raw) : null;

  const sm2Raw = row.soil_moisture_2 !== undefined ? row.soil_moisture_2 : (row.soil_moisture2 !== undefined ? row.soil_moisture2 : undefined);
  const soil_moisture_2 = sm2Raw !== undefined ? parseNumericValue(sm2Raw) : null;

  let soil_moisture_avg: number | null = null;
  if (soil_moisture_1 !== null && soil_moisture_2 !== null) {
    soil_moisture_avg = Math.round(((soil_moisture_1 + soil_moisture_2) / 2) * 100) / 100;
  } else if (soil_moisture_1 !== null) {
    soil_moisture_avg = soil_moisture_1;
  } else if (soil_moisture_2 !== null) {
    soil_moisture_avg = soil_moisture_2;
  } else {
    const generalSoilKey = findKeyCaseInsensitive(row, SOIL_MOISTURE_KEYS);
    if (generalSoilKey) {
      soil_moisture_avg = parseNumericValue(row[generalSoilKey]);
    }
  }

  // 5. Weather Metrics (temperature, humidity)
  const tempRaw = row.temperature !== undefined ? row.temperature : (row.temp !== undefined ? row.temp : undefined);
  const temperature = tempRaw !== undefined ? parseNumericValue(tempRaw) : null;

  const humRaw = row.humidity !== undefined ? row.humidity : (row.hum !== undefined ? row.hum : undefined);
  const humidity = humRaw !== undefined ? parseNumericValue(humRaw) : null;

  // 6. Gas & Air Quality Metrics (mq2_gas, air_quality)
  const mq2Raw = row.mq2_gas !== undefined ? row.mq2_gas : (row.mq2 !== undefined ? row.mq2 : (row.gas !== undefined ? row.gas : undefined));
  const mq2_gas = mq2Raw !== undefined ? parseNumericValue(mq2Raw) : null;

  const aqRaw = row.air_quality !== undefined ? row.air_quality : (row.aqi !== undefined ? row.aqi : undefined);
  const air_quality = aqRaw !== undefined ? (typeof aqRaw === 'number' ? aqRaw : String(aqRaw)) : null;

  // 7. Flow Rate / Water Speed (optional if present)
  const flowKey = findKeyCaseInsensitive(row, FLOW_RATE_KEYS);
  let flowRate: number | null = flowKey ? parseNumericValue(row[flowKey]) : null;
  let flowRateUnit = 'm/s';

  // 8. Timestamps (created_at or timestamp)
  const timeKey = findKeyCaseInsensitive(row, TIMESTAMP_KEYS);
  const timeResult = timeKey ? parseDateValue(row[timeKey]) : { date: null, raw: null };

  // 9. Sensor identifier & Location
  const sensorKey = findKeyCaseInsensitive(row, SENSOR_ID_KEYS);
  const sensorId = sensorKey ? String(row[sensorKey]) : null;
  const sensorName = sensorKey ? String(row[sensorKey]) : null;

  const locKey = findKeyCaseInsensitive(row, LOCATION_NAME_KEYS);
  const locationName = locKey ? String(row[locKey]) : null;

  // 10. Coordinates (latitude, longitude)
  const latKey = findKeyCaseInsensitive(row, LATITUDE_KEYS);
  const lngKey = findKeyCaseInsensitive(row, LONGITUDE_KEYS);
  const latitude = latKey ? parseNumericValue(row[latKey]) : null;
  const longitude = lngKey ? parseNumericValue(row[lngKey]) : null;

  // 11. Risk level (Critical threshold: water_level >= 80 or >= 4.0m)
  const riskKey = findKeyCaseInsensitive(row, RISK_KEYS);
  let riskLevel: RiskLevel = 'NORMAL';
  if (riskKey) {
    riskLevel = normalizeRiskLevel(row[riskKey]);
  } else if (waterLevel !== null) {
    if (waterLevelUnit === 'm') {
      if (waterLevel >= 4.0) riskLevel = 'CRITICAL';
      else if (waterLevel >= 2.5) riskLevel = 'WARNING';
      else riskLevel = 'NORMAL';
    } else {
      // For cm
      if (waterLevel >= 80) riskLevel = 'CRITICAL';
      else if (waterLevel >= 50) riskLevel = 'WARNING';
      else riskLevel = 'NORMAL';
    }
  }

  // 12. Extra metrics
  const knownUsedKeys = new Set([
    'id', '_id', 'uuid',
    'water_level', 'waterlevel', 'ultrasonic_cm', 'ultrasonic', 'distance_cm',
    'rain_intensity', 'rainfall', 'rain',
    'soil_moisture_1', 'soil_moisture_2', 'soil_moisture', 'soilmoisture',
    'temperature', 'temp', 'humidity', 'hum',
    'mq2_gas', 'mq2', 'gas', 'air_quality', 'aqi',
    'latitude', 'longitude', 'lat', 'lng', 'lon',
    'created_at', 'timestamp', 'time', 'ts',
    'sensor_id', 'device_id', 'node_id', 'location', 'location_name'
  ]);

  const extraMetrics: { key: string; label: string; value: any; unit?: string }[] = [];

  for (const [key, value] of Object.entries(row)) {
    if (knownUsedKeys.has(key.toLowerCase()) || value === null || value === undefined) continue;
    if (typeof value === 'object') continue;

    const label = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/^./, str => str.toUpperCase());

    let unit = '';
    const lk = key.toLowerCase();
    if (lk.includes('volt') || lk.includes('battery') || lk.includes('batt')) unit = lk.includes('volt') ? 'V' : '%';
    else if (lk.includes('press')) unit = 'hPa';

    extraMetrics.push({
      key,
      label,
      value,
      unit
    });
  }

  return {
    raw: row,
    id,
    water_level: waterLevel,
    waterLevel,
    waterLevelUnit,
    ultrasonic_cm,
    rain_intensity,
    rainfall: rain_intensity,
    rainfallUnit,
    soil_moisture_1,
    soil_moisture_2,
    soil_moisture_avg,
    soilMoisture: soil_moisture_avg,
    soilMoistureUnit: '%',
    temperature,
    humidity,
    mq2_gas,
    air_quality,
    flowRate,
    flowRateUnit,
    timestamp: timeResult.date,
    timestampRaw: timeResult.raw,
    sensorId,
    sensorName,
    locationName,
    latitude: (latitude !== null && latitude >= -90 && latitude <= 90) ? latitude : null,
    longitude: (longitude !== null && longitude >= -180 && longitude <= 180) ? longitude : null,
    riskLevel,
    extraMetrics
  };
}

export function parseAlert(row: DynamicRecord, index: number = 0): ParsedAlert {
  if (!row || typeof row !== 'object') {
    return {
      raw: {},
      id: index,
      device_id: null,
      occurred_at: null,
      occurred_at_raw: null,
      hazard_type: 'GENERAL',
      severity: 'normal',
      probability: null,
      message: 'No alert content',
      latitude: null,
      longitude: null,
      resolved: false,
      title: 'Alert',
      alertType: 'GENERAL',
      timestamp: null,
      timestampRaw: null,
      locationName: null,
      status: 'ACTIVE'
    };
  }

  const id = row.id ?? row._id ?? `alert-${index}`;

  // 1. device_id
  const devKey = findKeyCaseInsensitive(row, ['device_id', 'deviceid', 'sensor_id', 'node_id', 'station_id']);
  const device_id = devKey ? String(row[devKey]) : null;

  // 2. occurred_at (timestamptz)
  const timeKey = findKeyCaseInsensitive(row, ['occurred_at', 'occurredat', 'created_at', 'timestamp', 'time', 'date', 'recorded_at']);
  const timeResult = timeKey ? parseDateValue(row[timeKey]) : { date: null, raw: null };

  // 3. hazard_type (text)
  const hazardKey = findKeyCaseInsensitive(row, ['hazard_type', 'hazardtype', 'alert_type', 'type', 'event_type', 'event', 'category']);
  const hazard_type = hazardKey ? String(row[hazardKey]) : (row.title || 'FLOOD HAZARD');

  // 4. severity (text)
  const sevKey = findKeyCaseInsensitive(row, ['severity', 'alert_severity', 'level', 'risk_level', 'priority']);
  const severity = sevKey ? normalizeAlertSeverity(row[sevKey]) : 'warning';

  // 5. probability (numeric)
  const probKey = findKeyCaseInsensitive(row, ['probability', 'prob', 'confidence', 'risk_probability', 'probability_pct']);
  let probability = probKey ? parseNumericValue(row[probKey]) : null;
  // If probability is given as fraction 0.0 - 1.0, normalize to percentage 0 - 100 for display
  if (probability !== null && probability > 0 && probability <= 1.0) {
    probability = Math.round(probability * 100);
  }

  // 6. message (text)
  const msgKey = findKeyCaseInsensitive(row, ALERT_MESSAGE_KEYS);
  const message = msgKey ? String(row[msgKey]) : (row.description || row.title || row.alert || 'Hazard Warning Notification');

  // 7. latitude (float8) & longitude (float8)
  const latKey = findKeyCaseInsensitive(row, LATITUDE_KEYS);
  const lngKey = findKeyCaseInsensitive(row, LONGITUDE_KEYS);
  const latitude = latKey ? parseNumericValue(row[latKey]) : null;
  const longitude = lngKey ? parseNumericValue(row[lngKey]) : null;

  // 8. resolved (boolean)
  let resolved = false;
  if (row.resolved !== undefined && row.resolved !== null) {
    resolved = row.resolved === true || String(row.resolved).toLowerCase() === 'true' || row.resolved === 1;
  } else if (row.status !== undefined) {
    const s = String(row.status).toLowerCase();
    resolved = s === 'resolved' || s === 'closed' || s === 'inactive';
  }

  const locKey = findKeyCaseInsensitive(row, LOCATION_NAME_KEYS);
  const locationName = locKey ? String(row[locKey]) : (device_id ? `Device ${device_id}` : null);

  return {
    raw: row,
    id,
    device_id,
    occurred_at: timeResult.date,
    occurred_at_raw: timeResult.raw,
    hazard_type,
    severity,
    probability,
    message,
    latitude: (latitude !== null && latitude >= -90 && latitude <= 90) ? latitude : null,
    longitude: (longitude !== null && longitude >= -180 && longitude <= 180) ? longitude : null,
    resolved,
    // Helper & legacy aliases
    title: hazard_type,
    alertType: hazard_type,
    timestamp: timeResult.date,
    timestampRaw: timeResult.raw,
    locationName,
    status: resolved ? 'RESOLVED' : 'ACTIVE'
  };
}

export function calculateRateOfRise(readings: ParsedSensorReading[]): RateOfRise {
  const validReadings = readings
    .filter(r => r.waterLevel !== null && r.timestamp !== null)
    .sort((a, b) => (b.timestamp!.getTime() - a.timestamp!.getTime()));

  if (validReadings.length < 2) {
    return {
      ratePerHour: null,
      direction: 'unknown',
      unit: readings[0]?.waterLevelUnit || 'm',
      timeSpanMinutes: 0
    };
  }

  const latest = validReadings[0];
  const previous = validReadings[1];

  const timeDiffMs = latest.timestamp!.getTime() - previous.timestamp!.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  if (timeDiffHours <= 0 || timeDiffHours > 72) {
    // If readings are too close in time (< 1s) or too far apart (> 3 days)
    const levelDiff = (latest.waterLevel ?? 0) - (previous.waterLevel ?? 0);
    const isMeters = latest.waterLevelUnit.toLowerCase() === 'm';
    const thresh = isMeters ? 0.02 : 0.2;
    return {
      ratePerHour: Math.round(levelDiff * 100) / 100,
      direction: levelDiff > thresh ? 'rising' : levelDiff < -thresh ? 'falling' : 'stable',
      unit: latest.waterLevelUnit,
      timeSpanMinutes: Math.max(1, Math.round(timeDiffMs / (1000 * 60)))
    };
  }

  const levelDiff = (latest.waterLevel ?? 0) - (previous.waterLevel ?? 0);
  const ratePerHour = levelDiff / timeDiffHours;
  const roundedRate = Math.round(ratePerHour * 100) / 100;

  const isMeters = latest.waterLevelUnit.toLowerCase() === 'm';
  const riseThreshold = isMeters ? 0.05 : 0.5;

  let direction: 'rising' | 'falling' | 'stable' = 'stable';
  if (roundedRate > riseThreshold) direction = 'rising';
  else if (roundedRate < -riseThreshold) direction = 'falling';

  return {
    ratePerHour: roundedRate,
    direction,
    unit: latest.waterLevelUnit,
    timeSpanMinutes: Math.max(1, Math.round(timeDiffMs / (1000 * 60)))
  };
}

export function formatRelativeTime(date: Date | null, lang: 'en' | 'ta'): string {
  if (!date) return lang === 'ta' ? 'கிடைக்கவில்லை' : 'N/A';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) {
    return lang === 'ta' ? 'சற்று முன்' : 'just now';
  }
  if (diffSec < 60) {
    return lang === 'ta' ? `${diffSec} விநாடிகளுக்கு முன்பு` : `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'ta' ? `${diffMin} நிமிடங்களுக்கு முன்பு` : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return lang === 'ta' ? `${diffHours} மணி நேரத்திற்கு முன்பு` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === 'ta' ? `${diffDays} நாட்களுக்கு முன்பு` : `${diffDays}d ago`;
}
