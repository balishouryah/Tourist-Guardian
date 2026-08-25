import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import { DEMO_MAP_DATA } from '../../utils/mockMapData';

// Fix for default Leaflet marker icons not loading in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for different statuses
const createCustomIcon = (color, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
        ${isPulsing ? `<div style="position: absolute; width: 36px; height: 36px; background-color: ${color}; border-radius: 50%; animation: pulse 2s infinite; opacity: 0.4;"></div>` : ''}
        <div style="position: absolute; z-index: 2; background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

const safeIcon = createCustomIcon('#16a34a'); // green
const cautionIcon = createCustomIcon('#eab308'); // yellow
const helpIcon = createCustomIcon('#f97316'); // orange
const criticalIcon = createCustomIcon('#dc2626', true); // red pulsing

// A separate icon for the historical incident trigger point
const historicalIncidentIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `<div style="background-color: transparent; width: 14px; height: 14px; border-radius: 0; border: 2px dashed #dc2626; box-shadow: 0 0 4px rgba(0,0,0,0.5); transform: rotate(45deg);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

function MapController({ tourists, incidents, selectedTouristId, followMode }) {
  const map = useMap();
  const initialBoundsDone = useRef(false);
  
  useEffect(() => {
    // 1. Initial fit bounds
    if (!initialBoundsDone.current && (tourists.length > 0 || incidents.length > 0)) {
      const bounds = L.latLngBounds([]);
      tourists.forEach(t => {
        if (t.lat && t.lng) bounds.extend([t.lat, t.lng]);
      });
      incidents.forEach(inc => {
        if (inc.lat && inc.lng) bounds.extend([inc.lat, inc.lng]);
      });
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        initialBoundsDone.current = true;
      }
    }
  }, [tourists, incidents, map]);

  useEffect(() => {
    // 2. Follow Mode
    if (followMode && selectedTouristId) {
      const selectedT = tourists.find(t => t.id === selectedTouristId);
      if (selectedT && selectedT.lat && selectedT.lng) {
        map.setView([selectedT.lat, selectedT.lng], map.getZoom(), { animate: true });
      }
    }
  }, [tourists, followMode, selectedTouristId, map]);

  return null;
}

export default function LiveTouristLeaflet({ 
  tourists = [], 
  incidents = [], 
  selectedTouristId = null,
  onTouristSelect = () => {},
  onTouristViewAction = null,
  followMode = false,
  triggerFitBounds = 0, // changing this number triggers fitbounds
  layerMode = 'MARKERS', // 'MARKERS', 'HEATMAP', 'BOTH'
  heatType = 'TOURIST' // 'TOURIST', 'INCIDENT'
}) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (triggerFitBounds > 0 && mapRef.current) {
      const bounds = L.latLngBounds([]);
      tourists.forEach(t => {
        if (t.lat && t.lng) bounds.extend([t.lat, t.lng]);
      });
      incidents.forEach(inc => {
        if (inc.lat && inc.lng) bounds.extend([inc.lat, inc.lng]);
      });
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    }
  }, [triggerFitBounds, tourists, incidents]);

  const getTouristIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL': return criticalIcon;
      case 'HIGH_RISK': return helpIcon; // Orange
      case 'CAUTION': return cautionIcon; // Yellow
      default: return safeIcon;
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'ACTIVE SOS';
      case 'HIGH_RISK': return 'NEED HELP / ELEVATED';
      case 'CAUTION': return 'HIGH RISK / CAUTION';
      default: return 'ONLINE / NORMAL';
    }
  };

  const createClusterCustomIcon = function (cluster) {
    return L.divIcon({
      html: `<div style="background-color: var(--primary); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${cluster.getChildCount()}</div>`,
      className: 'custom-marker-cluster',
      iconSize: L.point(30, 30, true),
    });
  };

  // Compute Heatmap Points
  const heatPoints = React.useMemo(() => {
    if (layerMode === 'MARKERS') return [];
    
    if (heatType === 'TOURIST') {
      return tourists
        .filter(t => t.lat && t.lng)
        .map(t => {
          // Base intensity
          let intensity = 0.5; 
          // Boost intensity based on severity
          if (t.severity === 'CRITICAL') intensity = 1.0;
          if (t.severity === 'HIGH_RISK' || t.severity === 'HIGH') intensity = 0.8;
          return [t.lat, t.lng, intensity];
        });
    } else { // INCIDENT
      return incidents
        .filter(inc => inc.lat && inc.lng)
        .map(inc => {
          let intensity = inc.status === 'ACTIVE' ? 1.0 : 0.6;
          return [inc.lat, inc.lng, intensity];
        });
    }
  }, [tourists, incidents, layerMode, heatType]);

  // Fallback map center (India)
  const defaultCenter = [22.9734, 78.6569];

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={5} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Zones */}
        {DEMO_MAP_DATA.zones.map((zone) => (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{ 
              color: zone.type === 'safe' ? '#16a34a' : (zone.type === 'caution' ? '#eab308' : '#dc2626'),
              fillColor: zone.type === 'safe' ? '#dcfce7' : (zone.type === 'caution' ? '#fef08a' : '#fecaca'),
              fillOpacity: zone.type === 'safe' ? 0.2 : 0.4,
              weight: 2
            }}
          >
            <Popup>{zone.label}</Popup>
          </Circle>
        ))}

        <MapController 
          tourists={tourists} 
          incidents={incidents} 
          selectedTouristId={selectedTouristId} 
          followMode={followMode}
        />

        {['HEATMAP', 'BOTH'].includes(layerMode) && heatPoints.length > 0 && (
          <HeatmapLayer 
            points={heatPoints} 
            options={{ 
              radius: heatType === 'TOURIST' ? 25 : 35, 
              blur: 15, 
              maxZoom: 15,
              gradient: heatType === 'TOURIST' 
                ? { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
                : { 0.4: 'yellow', 0.8: 'orange', 1.0: 'red' }
            }} 
          />
        )}

        {['MARKERS', 'BOTH'].includes(layerMode) && (
          <MarkerClusterGroup 
            chunkedLoading 
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={40}
          >
            {tourists.map(t => {
              if (!t.lat || !t.lng) return null;
              return (
                <Marker 
                  key={`t-${t.id}`} 
                  position={[t.lat, t.lng]} 
                  icon={getTouristIcon(t.severity)}
                  eventHandlers={{
                    click: () => onTouristSelect(t.id)
                  }}
                >
                  <Popup>
                    <div style={{ padding: '4px', minWidth: '180px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px' }}>
                        {t.name?.toUpperCase() || 'UNKNOWN'} {t.isDemo && '(DEMO)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace', marginBottom: '8px' }}>
                        {t.safety_id || t.id}
                      </div>
                      
                      <div style={{ 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        color: t.severity === 'CRITICAL' ? '#dc2626' : t.severity === 'HIGH_RISK' || t.severity === 'HIGH' ? '#f97316' : t.severity === 'CAUTION' ? '#eab308' : '#16a34a',
                        marginBottom: '4px'
                      }}>
                        {getSeverityLabel(t.severity)}
                      </div>
                      
                      {t.score !== undefined && (
                        <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                          Safety Score: <strong>{t.score}/100</strong>
                        </div>
                      )}
                      
                      {t.last_location_update && (
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                          Last update:<br/>
                          {new Date(Date.now() - new Date(t.last_location_update).getTime()).getMinutes() < 2 ? 'Just now' : `${Math.floor((Date.now() - new Date(t.last_location_update).getTime()) / 60000)} minutes ago`}
                        </div>
                      )}

                      {onTouristViewAction && (
                        <button 
                          onClick={() => onTouristViewAction(t.id)}
                          style={{
                            width: '100%',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 0',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          View Tourist
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}

        {/* Historical Incident Locations */}
        {['MARKERS', 'BOTH'].includes(layerMode) && incidents.map(inc => {
          if (!inc.lat || !inc.lng) return null;
          return (
            <Marker
              key={`inc-${inc.id}`}
              position={[inc.lat, inc.lng]}
              icon={historicalIncidentIcon}
            >
              <Popup>
                <strong>Incident Origin</strong>
                <br/>
                SOS triggered here
                <br/>
                <span style={{ fontSize: '11px', color: '#666' }}>ID: {inc.id}</span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
