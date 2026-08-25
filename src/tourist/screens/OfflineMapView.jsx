import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLiveLocation } from '../../utils/LocationContext';
import { OFFLINE_REGIONS } from '../../services/offlineMapService';
import { useOfflineStatus } from '../../utils/useOfflineStatus';
import { useLanguage } from '../../utils/LanguageContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default Leaflet marker icons not loading in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function OfflineMapView() {
  const { t } = useLanguage();
  const { city } = useParams();
  const navigate = useNavigate();
  const { currentLoc } = useLiveLocation();
  const { isOnline } = useOfflineStatus();
  
  const [meta, setMeta] = useState(null);
  const region = OFFLINE_REGIONS[city];

  useEffect(() => {
    // Fetch metadata for bounding box calculations
    fetch(`/offline-maps/${city}.meta.json`)
      .then(res => res.json())
      .then(data => setMeta(data))
      .catch(err => console.warn('No offline map metadata found', err));
  }, [city]);

  if (!region) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p>Invalid region.</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const mapCenter = [
    (region.bounds.minLat + region.bounds.maxLat) / 2,
    (region.bounds.minLon + region.bounds.maxLon) / 2
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f0f0f0' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--on-surface)' }}>arrow_back</span>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t('offline_maps').toUpperCase()}: {region.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isOnline ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {isOnline ? 'wifi' : 'wifi_off'}
              </span>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Leaflet Map Viewer */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <MapContainer 
          center={mapCenter} 
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {currentLoc.latitude && currentLoc.longitude && (
            <Marker position={[currentLoc.latitude, currentLoc.longitude]}>
              <Popup>
                <strong>{t('your_location').toUpperCase()}</strong>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Status Bar */}
      <div style={{ background: 'var(--surface)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--outline-variant)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: currentLoc.latitude ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>gps_fixed</span>
            {currentLoc.latitude ? 'GPS ACTIVE' : 'GPS UNAVAILABLE'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
            Map data © OpenStreetMap contributors
          </span>
        </div>
        
        {currentLoc.latitude ? (
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
            Lat: {currentLoc.latitude.toFixed(4)} | Lon: {currentLoc.longitude.toFixed(4)} | Acc: ±{Math.round(currentLoc.accuracy)}m
          </div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
            Your downloaded map is still available.
          </div>
        )}
      </div>
    </div>
  );
}
