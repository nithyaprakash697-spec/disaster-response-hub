import React, { useState } from 'react';
import { 
  Waves, 
  MapPin, 
  Search, 
  Check, 
  Layers, 
  Thermometer, 
  Droplets, 
  Wind,
  Download, 
  Database,
  Code,
  Ruler,
  Navigation
} from 'lucide-react';
import { Language, ParsedSensorReading } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';
import { exportSensorReadingsToCsv } from '../lib/csvExport';

interface LiveSensorDataProps {
  readings: ParsedSensorReading[];
  latestReading: ParsedSensorReading | null;
  columns: string[];
  language: Language;
  onOpenSchema: () => void;
}

export const LiveSensorData: React.FC<LiveSensorDataProps> = ({
  readings,
  latestReading,
  columns,
  language,
  onOpenSchema
}) => {
  const t = getTranslation(language);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ParsedSensorReading | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Filter readings based on search term
  const filteredReadings = readings.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesId = String(r.id).toLowerCase().includes(term);
    const matchesWater = r.water_level !== null && String(r.water_level).includes(term);
    const matchesUltrasonic = r.ultrasonic_cm !== null && String(r.ultrasonic_cm).includes(term);
    const matchesRain = r.rain_intensity !== null && String(r.rain_intensity).includes(term);
    const matchesSm1 = r.soil_moisture_1 !== null && String(r.soil_moisture_1).includes(term);
    const matchesSm2 = r.soil_moisture_2 !== null && String(r.soil_moisture_2).includes(term);
    const matchesTemp = r.temperature !== null && String(r.temperature).includes(term);
    const matchesHum = r.humidity !== null && String(r.humidity).includes(term);
    const matchesMq2 = r.mq2_gas !== null && String(r.mq2_gas).includes(term);
    const matchesAq = r.air_quality !== null && String(r.air_quality).toLowerCase().includes(term);
    const matchesSensor = r.sensorId?.toLowerCase().includes(term);
    const matchesLoc = r.locationName?.toLowerCase().includes(term);

    return matchesId || matchesWater || matchesUltrasonic || matchesRain || matchesSm1 || matchesSm2 || 
           matchesTemp || matchesHum || matchesMq2 || matchesAq || matchesSensor || matchesLoc;
  });

  const handleExportCsv = () => {
    const dataToExport = filteredReadings.length > 0 ? filteredReadings : readings;
    if (dataToExport.length === 0) return;

    const prefix = searchTerm.trim() ? 'filtered_sensor_readings' : 'env_sensor_readings';
    const success = exportSensorReadingsToCsv(dataToExport, prefix);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    }
  };

  const handleCopyJson = (record: ParsedSensorReading) => {
    navigator.clipboard.writeText(JSON.stringify(record.raw, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="live-sensor-data-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Waves className="w-5 h-5 text-cyan-400" />
              <span>Live Telemetry Records</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
              {readings.length} rows
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed directly mirroring table <code className="font-mono text-cyan-400">env_sensor_readings</code>
          </p>
        </div>

        {/* Search & Action tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search table values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-60 font-mono"
            />
          </div>

          {/* Export CSV Button */}
          <button
            id="export-sensor-csv-btn"
            onClick={handleExportCsv}
            disabled={filteredReadings.length === 0}
            title={
              searchTerm.trim()
                ? `Export ${filteredReadings.length} filtered records as CSV`
                : `Export ${readings.length} sensor records as CSV`
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              exportSuccess
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : filteredReadings.length > 0
                ? 'bg-cyan-600/90 hover:bg-cyan-500 text-white border-cyan-500/50 shadow-sm hover:shadow active:scale-95'
                : 'bg-slate-800/60 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                <span>{t.exported}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-200" />
                <span>{t.exportCsv}</span>
                {searchTerm.trim() && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-800/80 text-cyan-100 font-mono">
                    {filteredReadings.length}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {readings.length === 0 ? (
        <div id="sensor-data-empty-state" className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4">
            <Waves className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {t.noDataTitle}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No telemetry data available from database table <code className="font-mono text-cyan-400">env_sensor_readings</code>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={onOpenSchema}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <Database className="w-3.5 h-3.5" />
              {t.schemaInspectorTitle}
            </button>
          </div>
        </div>
      ) : (
        /* Data Stream & Table with exact database column names */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto touch-pan-x scrollbar-thin">
            <table className="w-full text-left text-xs text-slate-300 font-mono min-w-[820px]">
              <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4">created_at</th>
                  <th className="py-3 px-4">water_level</th>
                  <th className="py-3 px-4">ultrasonic_cm</th>
                  <th className="py-3 px-4">rain_intensity</th>
                  <th className="py-3 px-4">soil_moisture (1 / 2)</th>
                  <th className="py-3 px-4">temp / hum</th>
                  <th className="py-3 px-4">mq2_gas / aqi</th>
                  <th className="py-3 px-4">latitude, longitude</th>
                  <th className="py-3 px-4">risk_level</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredReadings.map((reading, idx) => {
                  const isLatest = idx === 0;
                  return (
                    <tr 
                      key={reading.id || idx}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isLatest ? 'bg-cyan-950/20' : ''
                      }`}
                    >
                      {/* 1. created_at / Timestamp */}
                      <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isLatest && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          )}
                          <div>
                            <div>
                              {reading.timestamp 
                                ? new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  }).format(reading.timestamp)
                                : (reading.timestampRaw || '—')}
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              {formatRelativeTime(reading.timestamp, language)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. water_level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {reading.water_level !== null || reading.waterLevel !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-sm text-cyan-300">
                              {reading.water_level ?? reading.waterLevel}
                            </span>
                            <span className="text-[10px] text-cyan-500 font-sans">
                              {reading.waterLevelUnit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 3. ultrasonic_cm */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {reading.ultrasonic_cm !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sky-300">
                              {reading.ultrasonic_cm}
                            </span>
                            <span className="text-[10px] text-sky-500">cm</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 4. rain_intensity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {reading.rain_intensity !== null || reading.rainfall !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-purple-300">
                              {reading.rain_intensity ?? reading.rainfall}
                            </span>
                            <span className="text-[10px] text-purple-500">mm/hr</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 5. soil_moisture_1 & 2 */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {reading.soil_moisture_1 !== null || reading.soil_moisture_2 !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="text-amber-300 font-bold">{reading.soil_moisture_1 ?? '—'}%</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-amber-300 font-bold">{reading.soil_moisture_2 ?? '—'}%</span>
                          </div>
                        ) : reading.soilMoisture !== null ? (
                          <span className="text-amber-300 font-bold">{reading.soilMoisture}%</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 6. temperature & humidity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-300 font-bold">
                            {reading.temperature !== null ? `${reading.temperature}°C` : '—'}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className="text-blue-300 font-bold">
                            {reading.humidity !== null ? `${reading.humidity}%` : '—'}
                          </span>
                        </div>
                      </td>

                      {/* 7. mq2_gas & air_quality */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-300 font-bold">
                            {reading.mq2_gas !== null ? `${reading.mq2_gas} ppm` : '—'}
                          </span>
                          {reading.air_quality && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-sans">
                              {reading.air_quality}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. latitude, longitude */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        {reading.latitude !== null && reading.longitude !== null ? (
                          <span className="text-sky-300">
                            {reading.latitude.toFixed(4)}, {reading.longitude.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-slate-600">No GPS</span>
                        )}
                      </td>

                      {/* 9. risk_level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border font-sans ${
                          reading.riskLevel === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : reading.riskLevel === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {reading.riskLevel}
                        </span>
                      </td>

                      {/* 10. Action: View Raw JSON */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(reading)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-[11px] font-medium border border-slate-700 transition-colors inline-flex items-center gap-1 font-sans"
                        >
                          <Code className="w-3 h-3" />
                          <span>Raw</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw JSON Record Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                Raw Telemetry Packet (env_sensor_readings)
              </h4>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 overflow-x-auto max-h-72">
              <pre className="text-[11px] text-cyan-300 font-mono">
                {JSON.stringify(selectedRecord.raw, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopyJson(selectedRecord)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 inline-flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
