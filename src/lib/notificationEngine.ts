import { ParsedSensorReading, ParsedAlert, Language } from '../types';

export interface SystemNotification {
  id: string;
  source: 'sensor_threshold' | 'disaster_alert';
  type: 'flood_critical' | 'flood_warning' | 'gas_hazard' | 'rain_hazard' | 'soil_hazard' | 'disaster_record' | 'info';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: Date;
  locationName?: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceId?: string;
  metricLabel?: string;
  metricValue?: string | number;
  probability?: number | null;
  hazardType?: string;
  rawRecordId?: string | number;
}

/**
 * Derives actionable, clear, data-driven notifications strictly from
 * env_sensor_readings and disaster_alerts.
 */
export function generateDataDrivenNotifications(
  readings: ParsedSensorReading[],
  alerts: ParsedAlert[],
  language: Language = 'en'
): SystemNotification[] {
  const notifications: SystemNotification[] = [];

  // 1. Process active/unresolved records from disaster_alerts
  for (const alert of alerts) {
    if (alert.resolved) continue; // Only active threats

    const sev = alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info';
    const hazard = alert.hazard_type || alert.alertType || 'Hazard Event';
    const probStr = alert.probability !== null ? ` (Risk Probability: ${alert.probability}%)` : '';
    const devStr = alert.device_id ? ` at Node ${alert.device_id}` : '';
    const locStr = (alert.latitude !== null && alert.longitude !== null)
      ? ` [GPS: ${alert.latitude.toFixed(3)}, ${alert.longitude.toFixed(3)}]`
      : '';

    const title = language === 'ta'
      ? `${hazard} எச்சரிக்கை${devStr}`
      : `${hazard.toUpperCase()} Alert${devStr}${probStr}`;

    const message = alert.message || (
      language === 'ta'
        ? `செயலில் உள்ள பேரிடர் நிகழ்வு பதிவாகியுள்ளது: ${hazard}${locStr}`
        : `Active hazard recorded in disaster_alerts: ${hazard}${locStr}`
    );

    notifications.push({
      id: `alert-${alert.id}`,
      source: 'disaster_alert',
      type: 'disaster_record',
      title,
      message,
      severity: sev,
      timestamp: alert.occurred_at || alert.timestamp || new Date(),
      locationName: alert.locationName || (alert.device_id ? `Device ${alert.device_id}` : undefined),
      latitude: alert.latitude,
      longitude: alert.longitude,
      deviceId: alert.device_id || undefined,
      probability: alert.probability,
      hazardType: alert.hazard_type || alert.alertType,
      rawRecordId: alert.id
    });
  }

  // 2. Process real telemetry rows from env_sensor_readings
  // Evaluate the recent readings (up to 10 latest) to detect threshold crossings
  const recentReadings = readings.slice(0, 15);

  for (const r of recentReadings) {
    const devName = r.sensorId || r.locationName || 'Sensor Node';
    const locCoords = (r.latitude !== null && r.longitude !== null)
      ? ` (Latitude: ${r.latitude.toFixed(4)}, Longitude: ${r.longitude.toFixed(4)})`
      : '';

    const time = r.timestamp || new Date();

    // A. Critical Water Level / Ultrasonic
    // If water_level >= 80 or ultrasonic_cm <= 15 (close to sensor) or waterLevel >= 80
    const waterVal = r.water_level ?? r.waterLevel;
    const ultraVal = r.ultrasonic_cm;

    if (waterVal !== null && waterVal >= 80) {
      notifications.push({
        id: `sensor-flood-crit-${r.id}`,
        source: 'sensor_threshold',
        type: 'flood_critical',
        title: language === 'ta' ? 'அபாயகரமான வெள்ள எச்சரிக்கை!' : 'Critical Flood Threat',
        message: language === 'ta'
          ? `நீர் மட்டம் ${waterVal} ${r.waterLevelUnit}-ஐ எட்டியுள்ளது - முனை ${devName}${locCoords}`
          : `Critical Flood Warning: Water level reached ${waterVal} ${r.waterLevelUnit} at Node ${devName}${locCoords}`,
        severity: 'critical',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'water_level',
        metricValue: `${waterVal} ${r.waterLevelUnit}`,
        rawRecordId: r.id
      });
    } else if (waterVal !== null && waterVal >= 50) {
      notifications.push({
        id: `sensor-flood-warn-${r.id}`,
        source: 'sensor_threshold',
        type: 'flood_warning',
        title: language === 'ta' ? 'வெள்ள அபாய எச்சரிக்கை' : 'Elevated Water Level Alert',
        message: language === 'ta'
          ? `நீர் மட்டம் உயர்ந்துள்ளது (${waterVal} ${r.waterLevelUnit}) - முனை ${devName}${locCoords}`
          : `High Water Warning: Water level elevated at ${waterVal} ${r.waterLevelUnit} at Node ${devName}${locCoords}`,
        severity: 'warning',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'water_level',
        metricValue: `${waterVal} ${r.waterLevelUnit}`,
        rawRecordId: r.id
      });
    }

    // Check Ultrasonic distance if explicitly dangerous (e.g. water rise leaving < 20cm clearance)
    if (ultraVal !== null && ultraVal > 0 && ultraVal <= 20 && (waterVal === null || waterVal < 50)) {
      notifications.push({
        id: `sensor-ultra-crit-${r.id}`,
        source: 'sensor_threshold',
        type: 'flood_warning',
        title: language === 'ta' ? 'மீயொலி நீர் இடைவெளி குறைவு' : 'Ultrasonic High Water Proximity',
        message: language === 'ta'
          ? `மீயொலி சென்சார் இடைவெளி ${ultraVal} cm ஆக குறைந்துள்ளது (முனை ${devName})${locCoords}`
          : `Water clearance distance narrowed to ${ultraVal} cm at Node ${devName}${locCoords}`,
        severity: 'warning',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'ultrasonic_cm',
        metricValue: `${ultraVal} cm`,
        rawRecordId: r.id
      });
    }

    // B. Gas / Air Quality Thresholds
    if (r.mq2_gas !== null && r.mq2_gas >= 400) {
      notifications.push({
        id: `sensor-gas-crit-${r.id}`,
        source: 'sensor_threshold',
        type: 'gas_hazard',
        title: language === 'ta' ? 'அபாயகரமான வாயு / புகை கண்டறியப்பட்டது' : 'Toxic Gas / Smoke Detected',
        message: language === 'ta'
          ? `MQ2 வாயு அளவு ${r.mq2_gas} ppm ஐ எட்டியுள்ளது - முனை ${devName}${locCoords}`
          : `Hazardous Gas Spike: MQ2 reading spiked to ${r.mq2_gas} ppm at Node ${devName}${locCoords}`,
        severity: 'critical',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'mq2_gas',
        metricValue: `${r.mq2_gas} ppm`,
        rawRecordId: r.id
      });
    }

    // C. Intense Rainfall Spike
    const rainVal = r.rain_intensity ?? r.rainfall;
    if (rainVal !== null && rainVal >= 50) {
      notifications.push({
        id: `sensor-rain-crit-${r.id}`,
        source: 'sensor_threshold',
        type: 'rain_hazard',
        title: language === 'ta' ? 'கடுமையான மழைப்பொழிவு' : 'Torrential Rainfall Alert',
        message: language === 'ta'
          ? `மழை தீவிரம் ${rainVal} mm/hr - முனை ${devName}${locCoords}`
          : `Heavy Precipitation: Rainfall intensity reached ${rainVal} mm/hr at Node ${devName}${locCoords}`,
        severity: 'warning',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'rain_intensity',
        metricValue: `${rainVal} mm/hr`,
        rawRecordId: r.id
      });
    }

    // D. Soil Saturation Spike (Flash flood precursor)
    const soilVal = r.soil_moisture_avg ?? r.soilMoisture;
    if (soilVal !== null && soilVal >= 90) {
      notifications.push({
        id: `sensor-soil-crit-${r.id}`,
        source: 'sensor_threshold',
        type: 'soil_hazard',
        title: language === 'ta' ? 'மண் முழுமையான நீரிழப்பு (Saturation)' : 'Extreme Soil Moisture Saturation',
        message: language === 'ta'
          ? `மண் ஈரப்பதம் ${soilVal}% ஐ எட்டியுள்ளது, நிலச்சரிவு / வெள்ள அபாயம் - முனை ${devName}`
          : `Soil saturation reached ${soilVal}%, indicating imminent surface runoff at Node ${devName}${locCoords}`,
        severity: 'warning',
        timestamp: time,
        locationName: r.locationName || devName,
        latitude: r.latitude,
        longitude: r.longitude,
        deviceId: r.sensorId || undefined,
        metricLabel: 'soil_moisture_avg',
        metricValue: `${soilVal}%`,
        rawRecordId: r.id
      });
    }
  }

  // Sort by timestamp descending (newest first)
  notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return notifications;
}

/**
 * Synthesizes a soft, clean alert chime using browser Web Audio API.
 */
export function playAlertChime(severity: 'critical' | 'warning' | 'info' = 'info') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'critical' ? 'sawtooth' : 'sine';
    
    if (severity === 'critical') {
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + (severity === 'critical' ? 0.4 : 0.3));
  } catch (e) {
    // Audio autoplay or permission restriction gracefully ignored
  }
}
