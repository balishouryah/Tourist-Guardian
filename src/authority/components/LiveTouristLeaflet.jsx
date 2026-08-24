import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

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
  followMode = false,
  triggerFitBounds = 0 // changing this number triggers fitbounds
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

        <MapController 
          tourists={tourists} 
          incidents={incidents} 
          selectedTouristId={selectedTouristId} 
          followMode={followMode}
        />

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
                  <strong>{t.name || 'Unknown Tourist'}</strong> {t.isDemo && '(DEMO)'}
                  <br/>
                  {getSeverityLabel(t.severity)}
                  <br/>
                  <span style={{ fontSize: '11px', color: '#666' }}>ID: {t.safety_id || t.id}</span>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* Historical Incident Locations */}
        {incidents.map(inc => {
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
