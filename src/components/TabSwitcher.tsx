import React, { useRef, useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  MapPin, 
  Database,
  Sliders,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../lib/translations';

interface TabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  language: Language;
  unreadAlertCount: number;
  readingsCount: number;
  geoPointsCount: number;
  onOpenConfig?: () => void;
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({
  activeTab,
  onTabChange,
  language,
  unreadAlertCount,
  readingsCount,
  geoPointsCount,
  onOpenConfig
}) => {
  const t = getTranslation(language);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const tabs = [
    {
      id: 'overview',
      label: (t as any).navOverview || 'Overview & Active Alerts',
      icon: LayoutDashboard,
      badge: unreadAlertCount > 0 ? `${unreadAlertCount} active` : null,
      badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold',
      activeBadgeStyle: 'bg-slate-950 text-rose-300 font-bold'
    },
    {
      id: 'telemetry',
      label: (t as any).navTelemetry || 'Flood & Telemetry',
      icon: Activity,
      badge: readingsCount > 0 ? `${readingsCount} rows` : null,
      badgeStyle: 'bg-slate-800 text-cyan-300 border-slate-700 font-mono',
      activeBadgeStyle: 'bg-slate-950 text-cyan-300 font-mono font-bold'
    },
    {
      id: 'map',
      label: (t as any).navMap || 'Live Map & Nodes',
      icon: MapPin,
      badge: geoPointsCount > 0 ? `${geoPointsCount} pins` : null,
      badgeStyle: 'bg-slate-800 text-sky-300 border-slate-700 font-mono',
      activeBadgeStyle: 'bg-slate-950 text-sky-300 font-mono font-bold'
    },
    {
      id: 'schema',
      label: t.navSchema || 'Database Schema',
      icon: Database,
      badge: null,
      badgeStyle: '',
      activeBadgeStyle: ''
    },
  ];

  // Check scroll position to update scroll fade indicators
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  // Scroll active tab into view smoothly when changed
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      const activeBtn = el.querySelector(`#tab-switcher-btn-${activeTab}`) as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  const scrollBy = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div id="top-tab-switcher" className="w-full bg-slate-900/90 border-b border-slate-800/80 sticky top-[57px] z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 relative">
        {/* Left Scroll Indicator / Button for touch & mobile */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-150)}
            aria-label="Scroll tabs left"
            className="absolute left-1 z-10 p-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 shadow-md sm:hidden flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
          </button>
        )}

        {/* Scrollable Tabs Wrapper */}
        <div 
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-2 p-1 max-w-full touch-pan-x scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-switcher-btn-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`flex-shrink-0 shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="shrink-0">{tab.label}</span>
                {tab.badge && (
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                    isActive ? tab.activeBadgeStyle : tab.badgeStyle
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Indicator / Button for touch & mobile */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(150)}
            aria-label="Scroll tabs right"
            className="absolute right-2 sm:hidden z-10 p-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 shadow-md flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-cyan-400" />
          </button>
        )}

        {/* Quick Config Button (visible on md screens and up) */}
        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors shrink-0 flex-shrink-0 ml-2"
            title="Supabase Database Settings"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Config</span>
          </button>
        )}
      </div>
    </div>
  );
};
