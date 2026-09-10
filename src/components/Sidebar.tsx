import React from 'react';
import { 
  LayoutDashboard, 
  Waves, 
  MapPin, 
  Database,
  Radio,
  Sliders,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../lib/translations';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  language: Language;
  unreadAlertCount: number;
  readingsCount: number;
  geoPointsCount?: number;
  onOpenConfig: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  language,
  unreadAlertCount,
  readingsCount,
  geoPointsCount = 0,
  onOpenConfig
}) => {
  const t = getTranslation(language);

  const navItems = [
    {
      id: 'overview',
      label: (t as any).navOverview || 'Overview & Active Alerts',
      icon: LayoutDashboard,
      badge: unreadAlertCount > 0 ? unreadAlertCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold',
    },
    {
      id: 'telemetry',
      label: (t as any).navTelemetry || 'Flood & Telemetry',
      icon: Activity,
      badge: readingsCount > 0 ? `${readingsCount} rows` : null,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'map',
      label: (t as any).navMap || 'Live Map & Nodes',
      icon: MapPin,
      badge: geoPointsCount > 0 ? `${geoPointsCount} pins` : null,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    {
      id: 'schema',
      label: t.navSchema,
      icon: Database,
      badge: null,
    },
  ];

  return (
    <aside id="main-sidebar" className="w-full lg:w-64 bg-slate-900/80 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-3 sm:p-4 flex lg:flex-col justify-between shrink-0">
      <div className="w-full">
        {/* Navigation Bar / Tabs */}
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap lg:w-full ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.badge !== null && (
                  <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] border font-mono ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Info Card */}
      <div className="hidden lg:block pt-4 border-t border-slate-800/80 mt-auto">
        <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Telemetry Pipeline</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            ESP32 → Supabase → Dashboard
          </p>
          <button
            onClick={onOpenConfig}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
          >
            <Sliders className="w-3 h-3" />
            {t.navSettings}
          </button>
        </div>
      </div>
    </aside>
  );
};
