import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLiveLocation } from '../../utils/LocationContext';
import { OFFLINE_REGIONS } from '../../services/offlineMapService';
import { useOfflineStatus } from '../../utils/useOfflineStatus';
import { useLanguage } from '../../utils/LanguageContext';

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

  // Calculate GPS overlay position if metadata and GPS are available
  let gpsStyle = null;
  if (meta && currentLoc.latitude && currentLoc.longitude) {
    const { bounds, width, height } = meta;
    
    // Check if GPS is within bounds roughly
    if (
      currentLoc.longitude >= bounds.minLon &&
      currentLoc.longitude <= bounds.maxLon &&
      currentLoc.latitude >= bounds.minLat &&
      currentLoc.latitude <= bounds.maxLat
    ) {
      // Linear mapping
      const xPercent = (currentLoc.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon);
      const yPercent = (bounds.maxLat - currentLoc.latitude) / (bounds.maxLat - bounds.minLat);
      
      gpsStyle = {
        position: 'absolute',
        left: `${xPercent * width}px`,
        top: `${yPercent * height}px`,
        transform: 'translate(-50%, -100%)', // Anchor at bottom center like a map pin
        zIndex: 50,
      };
    }
  }

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

      {/* Static Image Map Viewer (Pan/Zoom via overflow) */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', touchAction: 'pan-x pan-y' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img 
            src={`/offline-maps/${city}.png`} 
            alt={`Offline map of ${region.name}`}
            style={{ display: 'block', minWidth: '100vw' }}
          />

          {gpsStyle ? (
            <div style={gpsStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                location_on
              </span>
              <div style={{ background: 'var(--surface)', padding: '4px 8px', borderRadius: '4px', fontSize: 10, fontWeight: 'bold', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)' }}>
                {t('your_location').toUpperCase()}
              </div>
            </div>
          ) : null}
        </div>
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
