import React, { useState, useMemo } from 'react';
import { 
  LineChart as ChartIcon, 
  Layers, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Check,
  Droplets,
  Waves,
  Gauge,
  Activity,
  Ruler
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { Language, ParsedSensorReading } from '../types';
import { getTranslation } from '../lib/translations';
import { exportSensorReadingsToCsv } from '../lib/csvExport';

interface WaterLevelChartProps {
  readings: ParsedSensorReading[];
  isLoading: boolean;
  language: Language;
  onRefresh: () => void;
}

type TimeRange = '1h' | '6h' | '24h' | 'all';

export const WaterLevelChart: React.FC<WaterLevelChartProps> = ({
  readings,
  isLoading,
  language,
  onRefresh
}) => {
  const t = getTranslation(language);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Exact Visibility Toggles
  const [showWaterLevel, setShowWaterLevel] = useState(true);
  const [showUltrasonic, setShowUltrasonic] = useState(true);
  const [showRainIntensity, setShowRainIntensity] = useState(true);
  const [showSoilMoistureAvg, setShowSoilMoistureAvg] = useState(true);
  const [showThreshold, setShowThreshold] = useState(true);

  // Filter & Format chart data chronologically (oldest to newest for X-axis)
  const chartData = useMemo(() => {
    const valid = readings
      .filter(r => 
        (r.water_level !== null || r.ultrasonic_cm !== null || r.rain_intensity !== null || r.soil_moisture_avg !== null) && 
        (r.timestamp !== null || r.timestampRaw !== null)
      )
      .map(r => {
        // Soil Moisture Avg: (soil_moisture_1 + soil_moisture_2) / 2 or fallback to available
        let soilAvg = r.soil_moisture_avg;
        if (soilAvg === null && r.soil_moisture_1 !== null && r.soil_moisture_2 !== null) {
          soilAvg = Math.round(((r.soil_moisture_1 + r.soil_moisture_2) / 2) * 100) / 100;
        } else if (soilAvg === null) {
          soilAvg = r.soil_moisture_1 ?? r.soil_moisture_2 ?? r.soilMoisture;
        }

        return {
          id: r.id,
          rawTimestamp: r.timestamp,
          timeLabel: r.timestamp 
            ? new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(r.timestamp)
            : r.timestampRaw || '',
          fullTimeLabel: r.timestamp
            ? new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(r.timestamp)
            : r.timestampRaw || '',
          water_level: r.water_level ?? r.waterLevel,
          ultrasonic_cm: r.ultrasonic_cm,
          rain_intensity: r.rain_intensity ?? r.rainfall,
          soil_moisture_1: r.soil_moisture_1,
          soil_moisture_2: r.soil_moisture_2,
          soil_moisture_avg: soilAvg,
          temperature: r.temperature,
          humidity: r.humidity,
          mq2_gas: r.mq2_gas,
          air_quality: r.air_quality,
          sensorId: r.sensorId || 'env_sensor_node',
          location: r.locationName || '',
          risk: r.riskLevel
        };
      });

    // Filter by time range
    const now = Date.now();
    let filtered = valid;
    if (timeRange === '1h') {
      filtered = valid.filter(d => d.rawTimestamp && (now - d.rawTimestamp.getTime()) <= 3600 * 1000);
    } else if (timeRange === '6h') {
      filtered = valid.filter(d => d.rawTimestamp && (now - d.rawTimestamp.getTime()) <= 6 * 3600 * 1000);
    } else if (timeRange === '24h') {
      filtered = valid.filter(d => d.rawTimestamp && (now - d.rawTimestamp.getTime()) <= 24 * 3600 * 1000);
    }

    // Sort chronologically ascending
    return [...filtered].sort((a, b) => {
      if (a.rawTimestamp && b.rawTimestamp) {
        return a.rawTimestamp.getTime() - b.rawTimestamp.getTime();
      }
      return 0;
    });
  }, [readings, timeRange, language]);

  const handleExportChartCsv = () => {
    const chartIds = new Set(chartData.map(d => d.id));
    const readingsForChart = readings.filter(r => chartIds.has(r.id));
    const toExport = readingsForChart.length > 0 ? readingsForChart : readings;
    if (toExport.length === 0) return;

    const success = exportSensorReadingsToCsv(toExport, `multi_sensor_timeseries_${timeRange}`);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    }
  };

  // Threshold determination: 80cm critical threshold (or 4.0m if unit is meters)
  const isMeters = useMemo(() => {
    const sample = readings.find(r => r.water_level !== null || r.waterLevel !== null);
    if (!sample) return false;
    const val = sample.water_level ?? sample.waterLevel ?? 0;
    return sample.waterLevelUnit === 'm' || (val > 0 && val < 10);
  }, [readings]);

  const criticalThreshold = isMeters ? 4.0 : 80;

  // Custom Multi-Sensor Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 min-w-[220px] backdrop-blur-md">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium font-mono">{data.fullTimeLabel}</span>
            {data.risk && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                data.risk === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                data.risk === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {data.risk}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {data.water_level !== null && (
              <div className="flex items-center justify-between gap-3 text-cyan-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  water_level:
                </span>
                <span className="font-bold text-white font-mono">{data.water_level} {isMeters ? 'm' : 'cm'}</span>
              </div>
            )}

            {data.ultrasonic_cm !== null && (
              <div className="flex items-center justify-between gap-3 text-sky-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Ruler className="w-3.5 h-3.5 text-sky-400" />
                  ultrasonic_cm:
                </span>
                <span className="font-bold text-white font-mono">{data.ultrasonic_cm} cm</span>
              </div>
            )}

            {data.rain_intensity !== null && (
              <div className="flex items-center justify-between gap-3 text-purple-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Droplets className="w-3.5 h-3.5 text-purple-400" />
                  rain_intensity:
                </span>
                <span className="font-bold text-white font-mono">{data.rain_intensity} mm/hr</span>
              </div>
            )}

            {data.soil_moisture_avg !== null && (
              <div className="flex items-center justify-between gap-3 text-amber-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  soil_moisture_avg:
                </span>
                <span className="font-bold text-white font-mono">{data.soil_moisture_avg}%</span>
              </div>
            )}

            {data.temperature !== null && (
              <div className="flex items-center justify-between gap-3 text-orange-300">
                <span className="font-medium">temperature:</span>
                <span className="font-bold text-white font-mono">{data.temperature}°C</span>
              </div>
            )}

            {data.humidity !== null && (
              <div className="flex items-center justify-between gap-3 text-blue-300">
                <span className="font-medium">humidity:</span>
                <span className="font-bold text-white font-mono">{data.humidity}%</span>
              </div>
            )}
          </div>

          {(data.sensorId || data.location) && (
            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
              <span>{data.sensorId ? `Node: ${data.sensorId}` : ''}</span>
              <span className="truncate max-w-[110px]">{data.location || ''}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="water-level-chart-container" className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header with Title and Range Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ChartIcon className="w-5 h-5 text-cyan-400" />
            {t.chartTitle}
          </h3>
          <p className="text-xs text-slate-400">
            Real-time multi-sensor telemetry from <code className="font-mono text-cyan-300">env_sensor_readings</code>
          </p>
        </div>

        {/* Time Range Filter Buttons & Export Action */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['1h', '6h', '24h', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range === '1h' ? '1H' : range === '6h' ? '6H' : range === '24h' ? '24H' : t.chartRangeAll}
              </button>
            ))}
          </div>

          <button
            id="export-chart-csv-btn"
            onClick={handleExportChartCsv}
            disabled={chartData.length === 0}
            title={language === 'ta' ? 'வரைபட தரவை CSV ஆக பதிவிறக்கு' : `Export ${chartData.length} chart records as CSV`}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              exportSuccess
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : chartData.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 shadow-sm'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white animate-bounce" />
                <span className="hidden xs:inline">{t.exported}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">{t.exportCsv}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visibility Checkbox Toggles */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
        <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Sensor Toggles:
        </span>

        {/* 1. Water Level (water_level) */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-cyan-500/50 transition-colors text-xs select-none">
          <input
            type="checkbox"
            checked={showWaterLevel}
            onChange={(e) => setShowWaterLevel(e.target.checked)}
            className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/20 bg-slate-900 w-3.5 h-3.5 accent-cyan-500 cursor-pointer"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50"></span>
          <span className={showWaterLevel ? 'text-cyan-200 font-medium font-mono' : 'text-slate-500 font-mono'}>
            water_level (Left Y)
          </span>
        </label>

        {/* 2. Distance Sensor (ultrasonic_cm) */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-sky-500/50 transition-colors text-xs select-none">
          <input
            type="checkbox"
            checked={showUltrasonic}
            onChange={(e) => setShowUltrasonic(e.target.checked)}
            className="rounded border-slate-700 text-sky-500 focus:ring-sky-500/20 bg-slate-900 w-3.5 h-3.5 accent-sky-500 cursor-pointer"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-500/50"></span>
          <span className={showUltrasonic ? 'text-sky-200 font-medium font-mono' : 'text-slate-500 font-mono'}>
            ultrasonic_cm (Left Y)
          </span>
        </label>

        {/* 3. Rain Intensity (rain_intensity) */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-purple-500/50 transition-colors text-xs select-none">
          <input
            type="checkbox"
            checked={showRainIntensity}
            onChange={(e) => setShowRainIntensity(e.target.checked)}
            className="rounded border-slate-700 text-purple-500 focus:ring-purple-500/20 bg-slate-900 w-3.5 h-3.5 accent-purple-500 cursor-pointer"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-sm shadow-purple-500/50"></span>
          <span className={showRainIntensity ? 'text-purple-200 font-medium font-mono' : 'text-slate-500 font-mono'}>
            rain_intensity (Right Y)
          </span>
        </label>

        {/* 4. Soil Moisture Avg ((soil_moisture_1 + soil_moisture_2) / 2) */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-amber-500/50 transition-colors text-xs select-none">
          <input
            type="checkbox"
            checked={showSoilMoistureAvg}
            onChange={(e) => setShowSoilMoistureAvg(e.target.checked)}
            className="rounded border-slate-700 text-amber-500 focus:ring-amber-500/20 bg-slate-900 w-3.5 h-3.5 accent-amber-500 cursor-pointer"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-500/50"></span>
          <span className={showSoilMoistureAvg ? 'text-amber-200 font-medium font-mono' : 'text-slate-500 font-mono'}>
            soil_moisture_avg (%)
          </span>
        </label>

        {/* 5. Critical Flood Threshold ReferenceLine */}
        <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-rose-500/50 transition-colors text-xs select-none">
          <input
            type="checkbox"
            checked={showThreshold}
            onChange={(e) => setShowThreshold(e.target.checked)}
            className="rounded border-slate-700 text-rose-500 focus:ring-rose-500/20 bg-slate-900 w-3.5 h-3.5 accent-rose-500 cursor-pointer"
          />
          <span className="w-2.5 h-1 border-b-2 border-dashed border-rose-400 inline-block"></span>
          <span className={showThreshold ? 'text-rose-300 font-medium font-mono' : 'text-slate-500 font-mono'}>
            Flood Limit ({criticalThreshold}{isMeters ? 'm' : 'cm'})
          </span>
        </label>
      </div>

      {/* Chart Canvas Area with Dual Y-Axes */}
      <div className="h-72 sm:h-96 w-full pt-2 min-w-0 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
            <span>Loading telemetry series...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
            <AlertTriangle className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-300">{t.noDataTitle}</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              No telemetry data available from <code className="font-mono text-cyan-400">env_sensor_readings</code>.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              {/* X-Axis: Time */}
              <XAxis 
                dataKey="timeLabel" 
                stroke="#64748b" 
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />

              {/* Left Y-Axis: water_level & ultrasonic_cm */}
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#38bdf8" 
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#0284c7' }}
                unit={isMeters ? ' m' : ' cm'}
                domain={['auto', 'auto']}
              />

              {/* Right Y-Axis: rain_intensity (mm/hr) & soil moisture (%) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#c084fc" 
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#9333ea' }}
                unit=" mm"
                domain={['auto', 'auto']}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={32}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />

              {/* Critical Flood Threshold Marker (Dashed Red ReferenceLine) */}
              {showThreshold && (
                <ReferenceLine 
                  yAxisId="left"
                  y={criticalThreshold} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{
                    value: `🚨 Critical Flood Limit (${criticalThreshold}${isMeters ? 'm' : 'cm'})`,
                    fill: '#f87171',
                    position: 'insideTopLeft',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
              )}

              {/* 1. Water Level Line (Left Y-Axis) */}
              {showWaterLevel && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="water_level"
                  name="water_level (cm/m)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#06b6d4' }}
                  activeDot={{ r: 5, fill: '#22d3ee', stroke: '#0891b2', strokeWidth: 2 }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}

              {/* 2. Distance Sensor Line (Left Y-Axis, ultrasonic_cm) */}
              {showUltrasonic && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ultrasonic_cm"
                  name="ultrasonic_cm (cm)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 2, fill: '#38bdf8' }}
                  activeDot={{ r: 4, fill: '#7dd3fc' }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}

              {/* 3. Rain Intensity Line (Right Y-Axis) */}
              {showRainIntensity && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rain_intensity"
                  name="rain_intensity (mm/hr)"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#a855f7' }}
                  activeDot={{ r: 4, fill: '#c084fc' }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}

              {/* 4. Soil Moisture Avg Line ((soil_moisture_1 + soil_moisture_2) / 2) */}
              {showSoilMoistureAvg && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="soil_moisture_avg"
                  name="soil_moisture_avg (%)"
                  stroke="#f59e0b"
                  strokeWidth={1.8}
                  strokeDasharray="4 2"
                  dot={{ r: 2, fill: '#f59e0b' }}
                  activeDot={{ r: 4, fill: '#fbbf24' }}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
