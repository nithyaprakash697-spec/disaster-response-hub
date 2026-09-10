import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  MapPin, 
  Map as MapIcon, 
  Radio, 
  ShieldAlert, 
  Waves, 
  Layers, 
  AlertTriangle, 
  Info, 
  Navigation, 
  Crosshair, 
  Percent, 
  Clock, 
  Cpu,
  Globe,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Flame,
  CloudRain
} from 'lucide-react';
import L from 'leaflet';
import { Language, ParsedSensorReading, ParsedAlert } from '../types';
import { getTranslation } from '../lib/translations';
import { formatRelativeTime } from '../lib/dataParser';

interface MonitoringMapProps {
  readings: ParsedSensorReading[];
  alerts: ParsedAlert[];
  language: Language;
  selectedCoordinate?: { lat: number; lng: number } | null;
  fullHeight?: boolean;
}

type MapLayerStyle = 'streets' | 'satellite' | 'hybrid';

export const MonitoringMap: React.FC<MonitoringMapProps> = ({
  readings,
  alerts,
  language,
  selectedCoordinate = null,
  fullHeight = false
}) => {
  const t = getTranslation(language);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const hybridLabelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hasInitialFitRef = useRef<boolean>(false);

  const [activeLayerStyle, setActiveLayerStyle] = useState<MapLayerStyle>('streets');
  const [filterType, setFilterType] = useState<'all' | 'sensors' | 'alerts'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(12);

  // Extract items with valid coordinates memoized
  const geoReadings = useMemo(() => {
    return readings.filter(
      r => r.latitude !== null && r.longitude !== null && !isNaN(r.latitude) && !isNaN(r.longitude)
    );
  }, [readings]);

  const geoAlerts = useMemo(() => {
    return alerts.filter(
      a => a.latitude !== null && a.longitude !== null && !isNaN(a.latitude) && !isNaN(a.longitude)
    );
  }, [alerts]);

  const totalGeoCount = geoReadings.length + geoAlerts.length;
  const hasCoordinates = totalGeoCount > 0;

  // 1. Initialize Map with strict world bounds and deep zoom support up to level 22
  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = geoReadings[0]?.latitude ?? geoAlerts[0]?.latitude ?? 13.0827;
      const initialLng = geoReadings[0]?.longitude ?? geoAlerts[0]?.longitude ?? 80.2707;

      // Strict boundaries to prevent infinite horizontal wrapping/scrolling
      const worldBounds = L.latLngBounds(
        L.latLng(-85.0511, -180),
        L.latLng(85.0511, 180)
      );

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 12,
        minZoom: 3,
        maxZoom: 22,
        maxBounds: worldBounds,
        maxBoundsViscosity: 1.0,
        worldCopyJump: false,
        zoomControl: false, // Custom zoom control for cleaner UI
      });

      map.on('zoomend', () => {
        setCurrentZoom(Math.round(map.getZoom()));
      });

      mapInstanceRef.current = map;
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Add default tile layer
      applyTileLayer(map, 'streets');
    }
  }, [hasCoordinates]);

  // Function to switch between Streets, Satellite, and Hybrid with maxNativeZoom deep scaling
  const applyTileLayer = (map: L.Map, style: MapLayerStyle) => {
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }
    if (hybridLabelsLayerRef.current) {
      map.removeLayer(hybridLabelsLayerRef.current);
      hybridLabelsLayerRef.current = null;
    }

    const worldBounds = L.latLngBounds(
      L.latLng(-85.0511, -180),
      L.latLng(85.0511, 180)
    );

    if (style === 'streets') {
      // Standard Streets (Carto Voyager) with upsampling past zoom 19
      baseTileLayerRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxNativeZoom: 19,
          maxZoom: 22,
          minZoom: 3,
          bounds: worldBounds,
          noWrap: true,
        }
      ).addTo(map);
    } else if (style === 'satellite') {
      // High-Resolution Optical Satellite with deep zoom support up to level 22
      baseTileLayerRef.current = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        {
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Google Satellite Imagery & GIS Data',
          maxNativeZoom: 20,
          maxZoom: 22,
          minZoom: 3,
          bounds: worldBounds,
          noWrap: true,
        }
      ).addTo(map);
    } else if (style === 'hybrid') {
      // High-Resolution Hybrid Satellite with Street Overlay and Landmark Labels
      baseTileLayerRef.current = L.tileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        {
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Google Satellite Hybrid Imagery, Roads & Places',
          maxNativeZoom: 20,
          maxZoom: 22,
          minZoom: 3,
          bounds: worldBounds,
          noWrap: true,
        }
      ).addTo(map);
    }
  };

  // Handle Layer Style Changes
  const handleLayerStyleChange = (style: MapLayerStyle) => {
    setActiveLayerStyle(style);
    if (mapInstanceRef.current) {
      applyTileLayer(mapInstanceRef.current, style);
    }
  };

  // 2. Render Markers for Sensors and Alerts
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    // A. Sensor Markers (from env_sensor_readings)
    if (filterType === 'all' || filterType === 'sensors') {
      geoReadings.forEach((reading) => {
        if (reading.latitude === null || reading.longitude === null) return;
        const pos: L.LatLngTuple = [reading.latitude, reading.longitude];
        bounds.push(pos);

        const isCrit = reading.riskLevel === 'CRITICAL';
        const isWarn = reading.riskLevel === 'WARNING';
        const color = isCrit ? '#f43f5e' : isWarn ? '#f59e0b' : '#06b6d4';
        const waterVal = reading.water_level ?? reading.waterLevel;

        const customHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background-color: #090d16; border: 2.5px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.6);">
              <span style="font-size: 11px;">💧</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-sensor-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const popupContent = `
          <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 4px; min-width: 220px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
              <div style="font-weight: 800; font-size: 13px; color: #0f172a; font-family: monospace;">
                ${reading.sensorId || reading.locationName || 'Sensor Node'}
              </div>
              <span style="font-size: 10px; font-weight: 800; color: ${color}; text-transform: uppercase; background-color: ${color}15; border: 1px solid ${color}40; padding: 2px 6px; border-radius: 6px;">
                ${reading.riskLevel}
              </span>
            </div>

            <div style="background-color: #f8fafc; border-radius: 8px; padding: 8px; margin-bottom: 8px; font-size: 11px; space-y: 4px; border: 1px solid #e2e8f0;">
              ${waterVal !== null ? `
                <div style="margin-bottom: 3px; display: flex; justify-content: space-between;">
                  <strong style="color: #0284c7;">water_level:</strong>
                  <strong style="color: #0f172a; font-family: monospace;">${waterVal} ${reading.waterLevelUnit}</strong>
                </div>
              ` : ''}
              ${reading.ultrasonic_cm !== null ? `
                <div style="margin-bottom: 3px; display: flex; justify-content: space-between;">
                  <strong style="color: #0369a1;">ultrasonic_cm:</strong>
                  <span style="font-family: monospace;">${reading.ultrasonic_cm} cm</span>
                </div>
              ` : ''}
              ${(reading.rain_intensity !== null || reading.rainfall !== null) ? `
                <div style="margin-bottom: 3px; display: flex; justify-content: space-between;">
                  <strong style="color: #7e22ce;">rain_intensity:</strong>
                  <span style="font-family: monospace;">${reading.rain_intensity ?? reading.rainfall} mm/hr</span>
                </div>
              ` : ''}
              ${reading.mq2_gas !== null ? `
                <div style="margin-bottom: 3px; display: flex; justify-content: space-between;">
                  <strong style="color: #d97706;">mq2_gas:</strong>
                  <span style="font-family: monospace;">${reading.mq2_gas} ppm</span>
                </div>
              ` : ''}
              ${reading.soil_moisture_avg !== null ? `
                <div style="display: flex; justify-content: space-between;">
                  <strong style="color: #b45309;">soil_moisture:</strong>
                  <span style="font-family: monospace;">${reading.soil_moisture_avg}%</span>
                </div>
              ` : ''}
            </div>

            <div style="font-size: 10px; color: #64748b; font-family: monospace; display: flex; justify-content: space-between;">
              <span>GPS: ${reading.latitude.toFixed(4)}, ${reading.longitude.toFixed(4)}</span>
              <span>Table: env_sensor_readings</span>
            </div>
          </div>
        `;

        const marker = L.marker(pos, { icon }).bindPopup(popupContent, {
          className: 'custom-leaflet-popup',
          maxWidth: 280
        });

        markersLayerRef.current?.addLayer(marker);
      });
    }

    // B. Disaster Alert Markers (from disaster_alerts)
    if (filterType === 'all' || filterType === 'alerts') {
      geoAlerts.forEach((alert) => {
        if (alert.latitude === null || alert.longitude === null) return;
        const pos: L.LatLngTuple = [alert.latitude, alert.longitude];
        bounds.push(pos);

        const isCrit = alert.severity === 'critical';
        const isWarn = alert.severity === 'warning';
        const bgCol = isCrit ? '#e11d48' : isWarn ? '#f59e0b' : '#10b981';

        const customHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; cursor: pointer;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 10px; background-color: ${bgCol}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 30px; height: 30px; border-radius: 10px; background-color: ${bgCol}; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
              <span style="font-size: 14px; font-weight: bold; color: #ffffff;">⚠️</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: customHtml,
          className: 'custom-alert-pin',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const popupContent = `
          <div style="font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 4px; min-width: 240px; color: #0f172a;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
              <span style="font-weight: 800; font-size: 13px; color: #e11d48; text-transform: uppercase;">
                ${alert.hazard_type || alert.alertType || 'HAZARD THREAT'}
              </span>
              <span style="font-size: 10px; font-weight: 800; color: #ffffff; background-color: ${bgCol}; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${alert.severity}
              </span>
            </div>

            ${alert.device_id ? `
              <div style="font-size: 11px; font-family: monospace; color: #0284c7; margin-bottom: 4px;">
                Node: <strong>${alert.device_id}</strong>
              </div>
            ` : ''}

            <div style="font-size: 12px; color: #0f172a; margin-bottom: 6px; line-height: 1.4; font-weight: 600;">
              ${alert.message}
            </div>

            <div style="background-color: #f8fafc; border-radius: 8px; padding: 6px 8px; font-size: 11px; color: #475569; margin-bottom: 6px; border: 1px solid #e2e8f0;">
              ${alert.probability !== null ? `
                <div style="margin-bottom: 2px; color: #e11d48; font-weight: 800;">
                  Risk Probability: ${alert.probability}%
                </div>
              ` : ''}
              <div style="color: ${alert.resolved ? '#059669' : '#dc2626'}; font-weight: 700;">
                Status: ${alert.resolved ? 'RESOLVED' : 'ACTIVE UNRESOLVED'}
              </div>
            </div>

            <div style="font-size: 10px; color: #94a3b8; font-family: monospace; display: flex; justify-content: space-between;">
              <span>GPS: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}</span>
              <span>Table: disaster_alerts</span>
            </div>
          </div>
        `;

        const marker = L.marker(pos, { icon }).bindPopup(popupContent, {
          className: 'custom-leaflet-popup',
          maxWidth: 300
        });

        markersLayerRef.current?.addLayer(marker);
      });
    }

    // Auto fit bounds only once on initial load if markers exist, preserving user zoom/pan interactions afterwards
    if (bounds.length > 0 && !hasInitialFitRef.current && !selectedCoordinate) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(bounds), {
        padding: [50, 50],
        maxZoom: 15
      });
      hasInitialFitRef.current = true;
    }
  }, [geoReadings, geoAlerts, filterType, hasCoordinates]);

  // 3. Handle Selected Coordinate Pan
  useEffect(() => {
    if (selectedCoordinate && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([selectedCoordinate.lat, selectedCoordinate.lng], 16, {
        duration: 1.2
      });
    }
  }, [selectedCoordinate]);

  // Reset to show all markers
  const handleResetBounds = () => {
    if (!mapInstanceRef.current) return;
    const allCoords: L.LatLngExpression[] = [
      ...geoReadings.map(r => [r.latitude!, r.longitude!] as L.LatLngTuple),
      ...geoAlerts.map(a => [a.latitude!, a.longitude!] as L.LatLngTuple),
    ];
    if (allCoords.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(allCoords), {
        padding: [50, 50],
        maxZoom: 15
      });
    }
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      id="monitoring-map-section" 
      className={`bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-950/95 flex flex-col' : ''
      }`}
    >
      {/* Top Map Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MapIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t.mapTitle}</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {totalGeoCount} Geocoded Pins
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time node telemetry coordinates & disaster alert ground zero locations
              </p>
            </div>
          </div>
        </div>

        {hasCoordinates && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 max-w-full overflow-x-auto scrollbar-none pb-1">
            {/* Satellite / Streets View Switcher */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                id="map-style-streets-btn"
                onClick={() => handleLayerStyleChange('streets')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeLayerStyle === 'streets'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Standard Carto Street Map"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Streets</span>
              </button>

              <button
                id="map-style-satellite-btn"
                onClick={() => handleLayerStyleChange('satellite')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeLayerStyle === 'satellite'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="High-Resolution Esri World Imagery Satellite"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>Satellite</span>
              </button>

              <button
                id="map-style-hybrid-btn"
                onClick={() => handleLayerStyleChange('hybrid')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all ${
                  activeLayerStyle === 'hybrid'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Satellite with Boundaries & City Labels"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Hybrid</span>
              </button>
            </div>

            {/* Marker Filter Toggle */}
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  filterType === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({totalGeoCount})
              </button>
              <button
                onClick={() => setFilterType('sensors')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterType === 'sensors' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Sensors ({geoReadings.length})</span>
              </button>
              <button
                onClick={() => setFilterType('alerts')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  filterType === 'alerts' ? 'bg-rose-950 text-rose-300 border border-rose-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-2 h-2 rounded-sm bg-rose-500"></span>
                <span>Alerts ({geoAlerts.length})</span>
              </button>
            </div>

            {/* Fit Bounds / Reset View Button */}
            <button
              onClick={handleResetBounds}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0"
              title="Fit all markers in view"
            >
              <Crosshair className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shrink-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen Map'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
            </button>
          </div>
        )}
      </div>

      {/* Map Canvas / Container */}
      {!hasCoordinates ? (
        <div id="map-no-coords-state" className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4">
            <Navigation className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">
            {t.mapNoCoords}
          </h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed mt-2">
            No active spatial coordinates found in <code className="font-mono text-cyan-400">env_sensor_readings</code> or <code className="font-mono text-rose-400">disaster_alerts</code>.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-slate-300 rounded-xl text-xs border border-slate-800 font-mono">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map automatically places pins when <code className="text-cyan-300">latitude</code> and <code className="text-cyan-300">longitude</code> columns exist.</span>
          </div>
        </div>
      ) : (
        <div className={`w-full rounded-2xl overflow-hidden border border-slate-800 relative z-0 shadow-inner group ${
          isFullscreen 
            ? 'flex-1 min-h-[450px]' 
            : fullHeight 
            ? 'h-[60vh] sm:h-[580px] min-h-[350px]' 
            : 'h-[60vh] sm:h-[500px] min-h-[320px]'
        }`}>
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Floating Map Controls overlay */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-cyan-400" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={handleResetBounds}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Center All Markers"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] flex flex-wrap items-center gap-3 shadow-lg">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-cyan-500/30"></span>
              <span>Telemetry Node</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 ring-2 ring-rose-500/30"></span>
              <span>Disaster Hazard Pin</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[10px] bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              <span>Zoom: <strong className="text-white">{currentZoom}x</strong> {currentZoom >= 18 ? '⚡ Max Detail' : ''}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-400 border-l border-slate-700/60 pl-3 font-mono text-[10px]">
              <span>Layer:</span>
              <span className="text-cyan-300 font-bold uppercase">{activeLayerStyle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
