import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Radio, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Language, RiskLevel, ParsedSensorReading, RateOfRise } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';

interface RiskStatusBannerProps {
  riskLevel: RiskLevel;
  latestReading: ParsedSensorReading | null;
  rateOfRise: RateOfRise;
  language: Language;
  criticalAlertsCount: number;
}

export const RiskStatusBanner: React.FC<RiskStatusBannerProps> = ({
  riskLevel,
  latestReading,
  rateOfRise,
  language,
  criticalAlertsCount
}) => {
  const t = getTranslation(language);

  const effectiveRisk: RiskLevel = criticalAlertsCount > 0 ? 'CRITICAL' : riskLevel;

  const getBannerStyles = () => {
    switch (effectiveRisk) {
      case 'CRITICAL':
        return {
          container: 'bg-rose-950/70 border-rose-500/50 text-rose-100 shadow-lg shadow-rose-950/40',
          badge: 'bg-rose-500 text-white font-black border-rose-400',
          icon: AlertCircle,
          iconColor: 'text-rose-400',
          title: t.riskCritical,
          subtitle: language === 'ta' 
            ? 'அதிதீவிர அபாய நிலை கண்டறியப்பட்டுள்ளது. நீர் மட்டம் ஆபத்து எல்லையை தாண்டியுள்ளது அல்லது அவசர எச்சரிக்கை செயலில் உள்ளது.' 
            : 'Immediate emergency alert. Water levels exceed safety thresholds or critical alerts are active.'
        };
      case 'WARNING':
        return {
          container: 'bg-amber-950/70 border-amber-500/50 text-amber-100 shadow-md shadow-amber-950/30',
          badge: 'bg-amber-500 text-slate-950 font-black border-amber-400',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          title: t.riskWarning,
          subtitle: language === 'ta' 
            ? 'எச்சரிக்கை நிலை. நீர் மட்டம் அதிகரித்து வருகிறது, தொடர்ந்து கண்காணிக்கவும்.' 
            : 'Elevated threat level. Water levels are rising or approaching advisory thresholds.'
        };
      case 'NORMAL':
      default:
        return {
          container: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100',
          badge: 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40',
          icon: CheckCircle,
          iconColor: 'text-emerald-400',
          title: t.riskNormal,
          subtitle: language === 'ta' 
            ? 'இயல்பு நிலை. அனைத்து சுற்றுச்சூழல் அளவீடுகளும் பாதுகாப்பான வரம்பிற்குள் உள்ளன.' 
            : 'Normal operating conditions. All monitored sensor telemetry within safe operating limits.'
        };
    }
  };

  const style = getBannerStyles();
  const Icon = style.icon;

  return (
    <div 
      id="risk-status-banner"
      className={`rounded-2xl border p-4 sm:p-5 transition-all ${style.container} backdrop-blur-sm`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Risk Indicator */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-current/20 shrink-0">
            <Icon className={`w-6 h-6 ${style.iconColor} ${effectiveRisk === 'CRITICAL' ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t.cardRiskLevel}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wide border ${style.badge}`}>
                {style.title}
              </span>
            </div>
            <p className="text-sm font-medium mt-1 text-slate-200">
              {style.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Telemetry Snapshot */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-2.5 sm:px-4 sm:py-2 rounded-xl border border-slate-800 text-xs text-slate-300 shrink-0">
          {/* Water level snippet */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t.cardWaterLevel}:</span>
            <span className="font-bold text-white text-sm">
              {latestReading && latestReading.waterLevel !== null
                ? `${latestReading.waterLevel} ${latestReading.waterLevelUnit}`
                : '—'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden xs:block"></div>

          {/* Rate snippet */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">{t.cardRateOfRise}:</span>
            <span className={`font-semibold flex items-center gap-1 ${
              rateOfRise.direction === 'rising' ? 'text-amber-400' :
              rateOfRise.direction === 'falling' ? 'text-emerald-400' : 'text-slate-300'
            }`}>
              {rateOfRise.direction === 'rising' && <TrendingUp className="w-3.5 h-3.5" />}
              {rateOfRise.direction === 'falling' && <TrendingDown className="w-3.5 h-3.5" />}
              {rateOfRise.direction === 'stable' && <Minus className="w-3.5 h-3.5" />}
              {rateOfRise.ratePerHour !== null
                ? `${rateOfRise.ratePerHour > 0 ? '+' : ''}${rateOfRise.ratePerHour} ${rateOfRise.unit}/h`
                : '—'}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden xs:block"></div>

          {/* Latest timestamp snippet */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {latestReading?.timestamp 
                ? formatRelativeTime(latestReading.timestamp, language)
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
