import { ParsedSensorReading, ParsedAlert } from '../types';

/**
 * Escapes a field value for CSV format according to RFC 4180 standard.
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  let stringValue: string;
  if (typeof value === 'object') {
    if (value instanceof Date) {
      stringValue = value.toISOString();
    } else {
      stringValue = JSON.stringify(value);
    }
  } else {
    stringValue = String(value);
  }

  // If the value contains comma, double-quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Triggers a direct client-side file download from string content in the browser.
 */
export function downloadFileInBrowser(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;'): boolean {
  try {
    // Include UTF-8 Byte Order Mark (BOM) so Excel and spreadsheet apps correctly render UTF-8 characters (e.g. Tamil or unicode symbols)
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('Failed to trigger CSV download:', error);
    return false;
  }
}

/**
 * Generates a timestamped filename like: sensor_readings_2026-08-25_09-30-00.csv
 */
export function generateCsvFilename(prefix: string = 'sensor_readings'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.csv`;
}

/**
 * Exports a list of ParsedSensorReading objects into a structured, comprehensive CSV file.
 */
export function exportSensorReadingsToCsv(
  readings: ParsedSensorReading[],
  filenamePrefix: string = 'disaster_sensor_telemetry'
): boolean {
  if (!readings || readings.length === 0) {
    return false;
  }

  // 1. Gather all dynamic extra metrics present in the readings
  const extraMetricKeysMap = new Map<string, string>(); // key -> label
  for (const r of readings) {
    if (r.extraMetrics && Array.isArray(r.extraMetrics)) {
      for (const em of r.extraMetrics) {
        if (!extraMetricKeysMap.has(em.key)) {
          const headerName = em.unit ? `${em.label} (${em.unit})` : em.label;
          extraMetricKeysMap.set(em.key, headerName);
        }
      }
    }
  }

  // 2. Define exact database column headers
  const headers: string[] = [
    'created_at (ISO)',
    'created_at (Formatted)',
    'water_level',
    'ultrasonic_cm',
    'rain_intensity',
    'soil_moisture_1',
    'soil_moisture_2',
    'soil_moisture_avg',
    'temperature',
    'humidity',
    'mq2_gas',
    'air_quality',
    'latitude',
    'longitude',
    'risk_level',
    'sensor_id',
    'location_name'
  ];

  // Append dynamic metrics
  const extraKeysList = Array.from(extraMetricKeysMap.keys());
  for (const key of extraKeysList) {
    headers.push(extraMetricKeysMap.get(key) || key);
  }

  // 3. Construct CSV Rows
  const rows: string[] = [];
  rows.push(headers.map(escapeCsvCell).join(','));

  for (const reading of readings) {
    const rowValues: any[] = [
      reading.timestamp ? reading.timestamp.toISOString() : (reading.timestampRaw || ''),
      reading.timestamp 
        ? reading.timestamp.toLocaleString('en-US', { timeZoneName: 'short' })
        : (reading.timestampRaw || ''),
      reading.water_level !== null ? reading.water_level : (reading.waterLevel !== null ? reading.waterLevel : ''),
      reading.ultrasonic_cm !== null ? reading.ultrasonic_cm : '',
      reading.rain_intensity !== null ? reading.rain_intensity : (reading.rainfall !== null ? reading.rainfall : ''),
      reading.soil_moisture_1 !== null ? reading.soil_moisture_1 : '',
      reading.soil_moisture_2 !== null ? reading.soil_moisture_2 : '',
      reading.soil_moisture_avg !== null ? reading.soil_moisture_avg : '',
      reading.temperature !== null ? reading.temperature : '',
      reading.humidity !== null ? reading.humidity : '',
      reading.mq2_gas !== null ? reading.mq2_gas : '',
      reading.air_quality !== null ? reading.air_quality : '',
      reading.latitude !== null ? reading.latitude : '',
      reading.longitude !== null ? reading.longitude : '',
      reading.riskLevel || 'NORMAL',
      reading.sensorId || '',
      reading.locationName || ''
    ];

    // Add dynamic extra metrics
    for (const key of extraKeysList) {
      const metric = reading.extraMetrics?.find(m => m.key === key);
      rowValues.push(metric?.value !== undefined && metric?.value !== null ? metric.value : '');
    }

    rows.push(rowValues.map(escapeCsvCell).join(','));
  }

  const csvContent = rows.join('\r\n');
  const filename = generateCsvFilename(filenamePrefix);
  return downloadFileInBrowser(csvContent, filename);
}

/**
 * Exports disaster alerts to CSV format matching exact disaster_alerts table schema.
 */
export function exportAlertsToCsv(
  alerts: ParsedAlert[],
  filenamePrefix: string = 'disaster_alerts'
): boolean {
  if (!alerts || alerts.length === 0) {
    return false;
  }

  const headers = [
    'occurred_at (ISO)',
    'occurred_at (Formatted)',
    'device_id',
    'hazard_type',
    'severity',
    'probability (%)',
    'message',
    'latitude',
    'longitude',
    'resolved',
    'alert_id'
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(',')];

  for (const alert of alerts) {
    const rowValues = [
      alert.occurred_at ? alert.occurred_at.toISOString() : (alert.occurred_at_raw || ''),
      alert.occurred_at ? alert.occurred_at.toLocaleString('en-US', { timeZoneName: 'short' }) : '',
      alert.device_id || '',
      alert.hazard_type || alert.alertType || '',
      alert.severity,
      alert.probability !== null ? `${alert.probability}%` : '',
      alert.message,
      alert.latitude !== null ? alert.latitude : '',
      alert.longitude !== null ? alert.longitude : '',
      alert.resolved ? 'true' : 'false',
      alert.id
    ];
    rows.push(rowValues.map(escapeCsvCell).join(','));
  }

  const csvContent = rows.join('\r\n');
  const filename = generateCsvFilename(filenamePrefix);
  return downloadFileInBrowser(csvContent, filename);
}
