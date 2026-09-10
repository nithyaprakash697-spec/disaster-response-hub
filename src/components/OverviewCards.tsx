import React from 'react';
import { 
  Waves, 
  Droplets, 
  Layers, 
  Thermometer, 
  Activity, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Radio,
  Wind,
  ShieldAlert,
  Ruler,
  Cpu
} from 'lucide-react';
import { Language, ParsedSensorReading, RateOfRise, ParsedAlert, RiskLevel } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';

interface OverviewCardsProps {
  latestReading: ParsedSensorReading | null;
  rateOfRise: RateOfRise;
  alerts: ParsedAlert[];
  riskLevel: RiskLevel;
  language: Language;
  isConnected: boolean;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  latestReading,
  rateOfRise,
  alerts,
  riskLevel,
  language,
  isConnected
}) => {
  const t = getTranslation(language);

  // Empty State if no sensor telemetry exists
  if (!latestReading) {
    return (
      <div 
        id="overview-cards-empty-state" 
        className="bg-slate-900/70 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <Radio className="w-6 h-6 animate-pulse text-cyan-400" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-bold text-slate-200">
            {language === 'ta' ? 'சென்சார் தரவுகள் எதுவும் கிடைக்கவில்லை' : 'No telemetry data available'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Waiting for real-time telemetry packets from table <code className="font-mono text-cyan-400">env_sensor_readings</code>.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Target Table: env_sensor_readings</span>
        </div>
      </div>
    );
  }

  // Rate of rise formatted string
  const rateText = rateOfRise.ratePerHour !== null
    ? `${rateOfRise.ratePerHour > 0 ? '+' : ''}${rateOfRise.ratePerHour} ${rateOfRise.unit}${t.unitPerHour}`
    : t.stable;

  const waterRisk = latestReading.riskLevel;

  // Rainfall classification badge
  const rainVal = latestReading.rain_intensity ?? latestReading.rainfall;
  let rainBadge = { text: 'Telemetry Synced', color: 'bg-purple-500/10 border-purple-500/30 text-purple-300' };
  if (rainVal !== null) {
    if (rainVal === 0) {
      rainBadge = { text: t.statusDry || 'Dry', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
    } else if (rainVal < 5) {
      rainBadge = { text: t.statusLight || 'Light Rain', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' };
    } else if (rainVal < 25) {
      rainBadge = { text: t.statusModerate || 'Moderate Rain', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
    } else {
      rainBadge = { text: t.statusHeavy || 'Heavy Rain', color: 'bg-rose-500/10 border-rose-500/30 text-rose-400' };
    }
  }

  // Soil Moisture stats
  const sm1 = latestReading.soil_moisture_1;
  const sm2 = latestReading.soil_moisture_2;
  const smAvg = latestReading.soil_moisture_avg ?? ((sm1 !== null && sm2 !== null) ? Math.round(((sm1 + sm2) / 2) * 100) / 100 : sm1 ?? sm2);

  // Air Quality & Gas badge
  const mq2Val = latestReading.mq2_gas;
  const aqVal = latestReading.air_quality;
  let gasBadge = { text: 'Normal Air', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' };
  if (mq2Val !== null && mq2Val > 400) {
    gasBadge = { text: 'Elevated Gas', color: 'bg-rose-500/10 border-rose-500/30 text-rose-400' };
  } else if (mq2Val !== null && mq2Val > 200) {
    gasBadge = { text: 'Moderate Gas', color: 'bg-amber-500/10 border-amber-500/30 text-amber-400' };
  }

  // Coordinates
  const hasGps = latestReading.latitude !== null && latestReading.longitude !== null;

  return (
    <div id="overview-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {/* 1. Water Level & Ultrasonic Distance Card */}
      <div 
        id="card-water-level"
        className={`bg-slate-900/80 border rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all flex flex-col justify-between ${
          waterRisk === 'CRITICAL'
            ? 'border-rose-500/50 bg-rose-950/20'
            : waterRisk === 'WARNING'
            ? 'border-amber-500/50 bg-amber-950/20'
            : 'border-slate-800 hover:border-cyan-500/40'
        }`}
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Water & Distance
            </p>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Waves className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {latestReading.water_level !== null || latestReading.waterLevel !== null ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {latestReading.water_level ?? latestReading.waterLevel}
                </span>
                <span className="text-xs font-bold text-cyan-400">
                  {latestReading.waterLevelUnit}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">—</span>
            )}
          </div>

          {/* Ultrasonic Distance */}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Ruler className="w-3 h-3 text-sky-400" />
              ultrasonic_cm:
            </span>
            <span className="font-mono font-bold text-sky-300 text-xs">
              {latestReading.ultrasonic_cm !== null ? `${latestReading.ultrasonic_cm} cm` : '—'}
            </span>
          </div>

          {/* Rate of rise indicator */}
          <div className="mt-2 flex items-center gap-1 text-[10px]">
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border font-semibold ${
              rateOfRise.direction === 'rising'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : rateOfRise.direction === 'falling'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              {rateOfRise.direction === 'rising' && <TrendingUp className="w-2.5 h-2.5 text-amber-400" />}
              {rateOfRise.direction === 'falling' && <TrendingDown className="w-2.5 h-2.5 text-emerald-400" />}
              {rateOfRise.direction === 'stable' && <Minus className="w-2.5 h-2.5 text-slate-400" />}
              <span>{rateText}</span>
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate max-w-[80px]">water_level</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
            waterRisk === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
            waterRisk === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
            'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}>
            {waterRisk}
          </span>
        </div>
      </div>

      {/* 2. Rain Intensity Card */}
      <div 
        id="card-rainfall"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-purple-500/40 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Rain Intensity
            </p>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {rainVal !== null ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {rainVal}
                </span>
                <span className="text-xs font-bold text-purple-400">
                  mm/hr
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">—</span>
            )}
          </div>

          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${rainBadge.color}`}>
              {rainBadge.text}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>rain_intensity</span>
          <span className="text-purple-300">Live</span>
        </div>
      </div>

      {/* 3. Soil Moisture 1 & 2 Card */}
      <div 
        id="card-soil-moisture"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-amber-500/40 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Soil Moisture 1 & 2
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {smAvg !== null ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {smAvg}
                </span>
                <span className="text-xs font-bold text-amber-400">
                  % avg
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">—</span>
            )}
          </div>

          {/* Dual Sensors Breakout */}
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] font-mono">
            <div className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              <span className="text-slate-500 block">S1:</span>
              <span className="text-amber-300 font-bold">{sm1 !== null ? `${sm1}%` : '—'}</span>
            </div>
            <div className="bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              <span className="text-slate-500 block">S2:</span>
              <span className="text-amber-300 font-bold">{sm2 !== null ? `${sm2}%` : '—'}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>soil_moisture</span>
          <span className="text-amber-400">Ground</span>
        </div>
      </div>

      {/* 4. Weather: Temperature & Humidity Card */}
      <div 
        id="card-weather"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-orange-500/40 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Temp & Humidity
            </p>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {latestReading.temperature !== null ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {latestReading.temperature}
                </span>
                <span className="text-xs font-bold text-orange-400">
                  °C
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">—</span>
            )}
          </div>

          {/* Humidity Indicator */}
          <div className="mt-1.5 flex items-center justify-between bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 font-mono">humidity:</span>
            <span className="text-cyan-300 font-mono font-bold">
              {latestReading.humidity !== null ? `${latestReading.humidity}%` : '—'}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>temperature</span>
          <span className="text-orange-400">Ambient</span>
        </div>
      </div>

      {/* 5. Air Quality & MQ2 Gas Level Card */}
      <div 
        id="card-gas-air"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/40 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Gas & Air Quality
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Wind className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-1.5">
            {mq2Val !== null ? (
              <>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                  {mq2Val}
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  ppm
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-500">—</span>
            )}
          </div>

          {/* Air Quality Index / AQI */}
          <div className="mt-1.5 flex items-center justify-between bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 font-mono">air_quality:</span>
            <span className="text-emerald-300 font-mono font-bold truncate max-w-[65px]">
              {aqVal !== null ? aqVal : 'Good'}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>mq2_gas</span>
          <span className={`px-1 rounded text-[9px] font-bold uppercase ${gasBadge.color}`}>
            {gasBadge.text}
          </span>
        </div>
      </div>

      {/* 6. GPS Status & Telemetry Node Card */}
      <div 
        id="card-gps-status"
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all hover:border-sky-500/40 flex flex-col justify-between"
      >
        <div>
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              GPS & Node Info
            </p>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            {hasGps ? (
              <div className="space-y-0.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lat:</span>
                  <span className="text-sky-300 font-bold">{latestReading.latitude?.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Lng:</span>
                  <span className="text-sky-300 font-bold">{latestReading.longitude?.toFixed(4)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1 text-slate-500">
                <span className="text-lg font-bold">No GPS Fix</span>
              </div>
            )}
          </div>

          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
              hasGps ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}>
              {hasGps ? 'GPS Synced' : 'Stationary Node'}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate max-w-[80px] font-mono">
            {latestReading.sensorId || 'Node 01'}
          </span>
          {latestReading.timestamp && (
            <span className="text-slate-500 text-[10px]">
              {formatRelativeTime(latestReading.timestamp, language)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
