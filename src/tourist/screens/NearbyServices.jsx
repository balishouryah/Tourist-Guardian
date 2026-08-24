import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveLocation } from '../../utils/LocationContext';
import { useAuth } from '../../utils/AuthContext';
import { searchNearbyPOIs, POI_CATEGORIES } from '../../services/poiService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EmergencyPoliceButton from '../../components/EmergencyPoliceButton';
import { useLanguage } from '../../utils/LanguageContext';
import './NearbyServices.css'; // We'll create this or use inline styles

// Fix Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dynamic marker icon generator
const getMarkerIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Pulsing User Location Marker
const pulsingUserIcon = L.divIcon({
  className: 'pulsing-user-marker',
  html: '<div class="pulse-ring"></div><div class="pulse-dot"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0]) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  return null;
}

export default function NearbyServices() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLoc, gpsStatus, tracking, requestPermissionAndStart } = useLiveLocation();
  const { isDemoMode } = useAuth();
  
  const latitude = currentLoc?.latitude;
  const longitude = currentLoc?.longitude;
  const accuracy = currentLoc?.accuracy;
  
  const searchParams = new URLSearchParams(location.search);
  const initialCategory = searchParams.get('category') || 'hospital';
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchRadius, setSearchRadius] = useState(5000); // 5km
  const [lastSearchedLoc, setLastSearchedLoc] = useState(null);

  // Group categories for UI
  const emergencyCategories = Object.keys(POI_CATEGORIES).filter(k => POI_CATEGORIES[k].type === 'emergency');
  const everydayCategories = Object.keys(POI_CATEGORIES).filter(k => POI_CATEGORIES[k].type === 'everyday');

  const fetchPOIs = async (radius = 5000, force = false) => {
    if (!latitude || !longitude) return;

    // Check if we moved significantly (e.g., > 500m) to avoid excessive API calls
    if (!force && lastSearchedLoc) {
      // Very basic distance check (Haversine omitted here for brevity, just using rough lat/lon diff)
      const diffLat = Math.abs(latitude - lastSearchedLoc.lat);
      const diffLon = Math.abs(longitude - lastSearchedLoc.lon);
      if (diffLat < 0.005 && diffLon < 0.005) {
        return; // Haven't moved enough
      }
    }

    setLoading(true);
    setError('');
    
    try {
      let data = await searchNearbyPOIs(activeCategory, latitude, longitude, radius);
      
      // Auto-expand radius if no results for emergency
      if (data.length === 0 && radius < 20000 && POI_CATEGORIES[activeCategory].type === 'emergency') {
        const newRadius = radius === 5000 ? 10000 : 20000;
        setSearchRadius(newRadius);
        data = await searchNearbyPOIs(activeCategory, latitude, longitude, newRadius);
      }
      
      setResults(data);
      setLastSearchedLoc({ lat: latitude, lon: longitude });
    } catch (err) {
      if (err.message === 'OFFLINE') {
        setError('Live nearby search is unavailable while offline.');
      } else if (err.message === 'RATE_LIMIT') {
        setError('Too many requests to the map provider. Please wait a moment.');
      } else {
        setError('Failed to find nearby services. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOIs(searchRadius, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, latitude, longitude]); // re-fetch when category or major location changes

  const handleNavigate = (poi) => {
    // Open native maps intent
    const url = `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}`;
    window.open(url, '_blank');
  };

  const handleARNavigate = (poi) => {
    // Route to AR View with destination state
    navigate('/tourist/ar', { state: { destination: { lat: poi.lat, lon: poi.lon, name: poi.name } } });
  };

  const renderCategoryPills = (categories) => (
    <div className="nearby-category-scroll">
      {categories.map(key => {
        const cat = POI_CATEGORIES[key];
        return (
          <button
            key={key}
            className={`nearby-pill ${activeCategory === key ? 'active' : ''} ${cat.type}`}
            onClick={() => { setSearchRadius(5000); setActiveCategory(key); }}
          >
            <span className="material-symbols-outlined">{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="nearby-screen">
      <div className="nearby-header">
        <h1>{t('nearby_services')}</h1>
        {isDemoMode && <div className="demo-badge" style={{ backgroundColor: 'var(--warning)', color: '#000', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>DEMO MODE</div>}
      </div>

      {!navigator.onLine && (
        <div className="offline-banner" style={{ backgroundColor: 'var(--warning)', color: '#000', padding: '12px', margin: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined">wifi_off</span>
          <span><strong>Offline:</strong> Live nearby search is unavailable.</span>
        </div>
      )}

      {gpsStatus === 'DENIED' && (
        <div className="location-error-banner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', margin: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>location_disabled</span>
            Location permission is disabled.
          </div>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={requestPermissionAndStart}>Enable Location</button>
        </div>
      )}
      
      {gpsStatus === 'UNAVAILABLE' && (
        <div className="location-error-banner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', margin: '16px', borderRadius: '8px' }}>
          <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '8px' }}>error</span>
          Unable to determine your location.
        </div>
      )}

      <div className="nearby-filters">
        <h3 className="filter-title" style={{ color: 'var(--error)' }}>🚨 Emergency</h3>
        {renderCategoryPills(emergencyCategories)}
        
        <h3 className="filter-title" style={{ marginTop: '16px' }}>Essentials</h3>
        {renderCategoryPills(everydayCategories)}
      </div>

      {latitude && longitude ? (
        <div className="nearby-map-container" style={{ height: '250px', margin: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--outline)' }}>
          <MapContainer center={[latitude, longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapUpdater center={[latitude, longitude]} />
            
            {/* Map Legend */}
            <div className="nearby-map-legend">
              {Object.keys(POI_CATEGORIES).map(k => (
                <div key={k} className="legend-item">
                  <span className={`legend-dot bg-${POI_CATEGORIES[k].markerColor}`}></span>
                  <span className="legend-label">{POI_CATEGORIES[k].label}</span>
                </div>
              ))}
            </div>

            {/* Tourist Location */}
            <Marker position={[latitude, longitude]} icon={pulsingUserIcon}>
              <Popup>📍 YOU</Popup>
            </Marker>

            {/* POI Locations */}
            {results.map(poi => {
              const categoryConfig = POI_CATEGORIES[poi.category];
              return (
                <Marker 
                  key={poi.id} 
                  position={[poi.lat, poi.lon]}
                  icon={getMarkerIcon(categoryConfig.markerColor)}
                >
                  <Popup>
                    <span style={{ fontWeight: 'bold' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                        {categoryConfig.icon}
                      </span>
                      {poi.name}
                    </span><br/>
                    {poi.distance.toFixed(2)} km away
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
            {gpsStatus === 'DENIED' ? 'location_off' : 'location_searching'}
          </span>
          {gpsStatus === 'DENIED' ? (
            <p>Location permission is disabled</p>
          ) : gpsStatus === 'UNAVAILABLE' ? (
            <p>Unable to determine your location</p>
          ) : !tracking ? (
            <>
              <p style={{ marginBottom: '16px' }}>Location access required to find nearby services.</p>
              <button className="btn btn-primary" onClick={requestPermissionAndStart}>Enable GPS</button>
            </>
          ) : (
            <p>Locating you...</p>
          )}
        </div>
      )}

      {latitude && longitude && (
        <div style={{ padding: '0 16px', fontSize: '12px', color: 'var(--on-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            📍 {t('your_location')}: {latitude.toFixed(5)}, {longitude.toFixed(5)} 
            {accuracy && ` (Accuracy: ~${Math.round(accuracy)}m)`}
          </div>
          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => fetchPOIs(searchRadius, true)} title="Recenter on Me">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
          </button>
        </div>
      )}

      <div className="nearby-results-list" style={{ padding: '0 16px 100px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>{t('results')} ({results.length})</h2>
          <button onClick={() => fetchPOIs(searchRadius, true)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} disabled={loading}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>refresh</span>
            {t('refresh')}
          </button>
        </div>

        {activeCategory === 'police' && (
          <div style={{ marginBottom: '16px' }}>
            <EmergencyPoliceButton phoneNumber="112" showNearbyAction={false} />
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}>Finding nearby services...</div>}
        
        {!loading && error && <div style={{ color: 'var(--error)', textAlign: 'center', padding: '24px' }}>{error}</div>}
        
        {!loading && !error && results.length === 0 && latitude && (
          <div style={{ textAlign: 'center', padding: '32px', background: 'var(--surface-container-low)', borderRadius: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--outline)', marginBottom: '16px' }}>search_off</span>
            <p>No nearby {POI_CATEGORIES[activeCategory].label.toLowerCase()} found within {searchRadius / 1000} km.</p>
            {searchRadius < 20000 && (
              <button className="btn btn-secondary" onClick={() => fetchPOIs(searchRadius + 5000, true)} style={{ marginTop: '16px' }}>
                Search Farther
              </button>
            )}
          </div>
        )}

        {!loading && results.map(poi => {
          const categoryConfig = POI_CATEGORIES[poi.category];
          
          // Map leaflet-color-markers string to CSS var
          let colorVar = 'var(--primary)';
          if (categoryConfig.markerColor === 'red') colorVar = 'var(--error)';
          if (categoryConfig.markerColor === 'orange') colorVar = '#f97316';
          if (categoryConfig.markerColor === 'yellow') colorVar = '#eab308';
          if (categoryConfig.markerColor === 'green') colorVar = 'var(--success)';
          if (categoryConfig.markerColor === 'blue') colorVar = '#3b82f6';
          if (categoryConfig.markerColor === 'violet') colorVar = '#8b5cf6';
          if (categoryConfig.markerColor === 'black') colorVar = '#1f2937';
          if (categoryConfig.markerColor === 'grey') colorVar = '#6b7280';
          
          return (
          <div key={poi.id} className="poi-card" style={{ background: 'var(--surface-container-low)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundColor: colorVar, 
                    color: '#fff' 
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {categoryConfig.icon}
                    </span>
                  </span>
                  {poi.name}
                </h3>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
                  {poi.distance.toFixed(2)} km away {poi.address ? `• ${poi.address}` : ''}
                </p>
                {poi.opening_hours && (
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--success)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                    {poi.opening_hours}
                  </p>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button className="btn btn-primary" onClick={() => handleNavigate(poi)} style={{ flex: 1, padding: '8px', fontSize: '14px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>navigation</span>
                {t('directions')}
              </button>
              
              <button className="btn btn-secondary" onClick={() => handleARNavigate(poi)} style={{ padding: '8px', fontSize: '14px' }} title="AR View">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_in_ar</span>
              </button>

              {poi.phone && (
                <a href={`tel:${poi.phone}`} className="btn btn-secondary" style={{ padding: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span>
                </a>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
