import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import { DEMO_MAP_DATA } from '../utils/mockMapData';
import './InteractiveMap.css';

// Fix for default Leaflet marker icons not loading in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for different statuses
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

const safeIcon = createCustomIcon('#16a34a'); // green
const criticalIcon = createCustomIcon('#dc2626'); // red
const checkpointIcon = createCustomIcon('#2563eb'); // blue
const helpIcon = createCustomIcon('#f59e0b'); // amber

export default function InteractiveMap({ 
  showAuthorityView = false, 
  incidentState = { active: false, severity: 'SAFE' },
  currentLoc = null,
  liveTouristData = null
}) {
  const isCritical = incidentState.severity === 'CRITICAL';
  
  // Incident Icon (Red pulsing if critical)
  const incidentIcon = isCritical ? criticalIcon : helpIcon;
  
  const touristPosition = currentLoc && currentLoc.latitude 
    ? [currentLoc.latitude, currentLoc.longitude]
    : (showAuthorityView && incidentState.latitude ? [incidentState.latitude, incidentState.longitude] : DEMO_MAP_DATA.touristCurrent);
    
  // If we have a live location and we're not in authority view, center the map there initially
  const mapCenter = showAuthorityView && liveTouristData?.current_latitude 
    ? [liveTouristData.current_latitude, liveTouristData.current_longitude]
    : (touristPosition || DEMO_MAP_DATA.mapCenter);

  return (
    <div className="interactive-map-wrapper">
      <MapContainer 
        center={mapCenter} 
        zoom={DEMO_MAP_DATA.defaultZoom} 
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={showAuthorityView}
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
              color: zone.type === 'safe' ? '#16a34a' : '#dc2626',
              fillColor: zone.type === 'safe' ? '#dcfce7' : '#fecaca',
              fillOpacity: zone.type === 'safe' ? 0.2 : (isCritical ? 0.5 : 0.3), // Pulse/darken on critical
              weight: 2
            }}
          >
            <Popup>{zone.label}</Popup>
          </Circle>
        ))}

        {/* Planned Route (Gray/Blue dashed) */}
        <Polyline 
          positions={DEMO_MAP_DATA.plannedRoute} 
          pathOptions={{ color: '#94a3b8', weight: 4, dashArray: '8, 8' }} 
        />

        {/* Actual Taken Route (Red if critical, else Green) */}
        <Polyline 
          positions={DEMO_MAP_DATA.actualRoute} 
          pathOptions={{ color: isCritical ? '#dc2626' : '#16a34a', weight: 5 }} 
        />

        {/* Checkpoints */}
        {DEMO_MAP_DATA.checkpoints.map(cp => (
          <Marker key={cp.id} position={cp.pos} icon={checkpointIcon}>
            <Popup>{cp.name}</Popup>
          </Marker>
        ))}

        {/* Help Points (Authority View typically cares more about these) */}
        {showAuthorityView && DEMO_MAP_DATA.helpPoints.map(hp => (
          <Marker key={hp.id} position={hp.pos} icon={helpIcon}>
            <Popup>Help Point: {hp.name}</Popup>
          </Marker>
        ))}

        {/* Incident Location Marker (Where the SOS was fired) */}
        {showAuthorityView && incidentState?.latitude && incidentState?.longitude && (
          <Marker position={[incidentState.latitude, incidentState.longitude]} icon={incidentIcon}>
            <Popup>
              <strong>Incident Location</strong><br/>
              {isCritical ? 'CRITICAL - Deviation Detected' : 'SOS Triggered Here'}
            </Popup>
          </Marker>
        )}

        {/* Live Tourist Marker */}
        {showAuthorityView && liveTouristData?.current_latitude && liveTouristData?.current_longitude && (
          <Marker position={[liveTouristData.current_latitude, liveTouristData.current_longitude]} icon={safeIcon}>
            <Popup>
              <strong>Live Tourist Location</strong><br/>
              Updated recently
            </Popup>
          </Marker>
        )}
        
        {/* Tourist Mode: Current self position */}
        {!showAuthorityView && (
          <Marker position={touristPosition} icon={safeIcon}>
            <Popup>
              <strong>Your Location</strong>
            </Popup>
          </Marker>
        )}

      </MapContainer>
    </div>
  );
}
