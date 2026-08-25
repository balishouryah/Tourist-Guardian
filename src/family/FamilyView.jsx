import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers based on severity
const getMarkerIcon = (severity, isEmergency) => {
  const color = isEmergency || severity === 'CRITICAL' ? 'red' 
              : severity === 'HIGH' ? 'orange' 
              : severity === 'CAUTION' ? 'gold' 
              : 'green';
              
  return new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5); ${isEmergency ? 'animation: pulse 1.5s infinite;' : ''}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

export default function FamilyView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const fetchFamilyData = async () => {
    try {
      const { data: res, error: rpcError } = await supabase.rpc('get_family_view_data', { p_token: token });
      
      if (rpcError) throw rpcError;
      
      if (res.error) {
        setError(res.error);
        setData(null);
      } else {
        setData(res);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching family data:', err);
      setError('Unable to fetch live tracking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyData();
    
    // Poll every 15 seconds to simulate realtime for unauthenticated users securely
    const interval = setInterval(fetchFamilyData, 15000);
    return () => clearInterval(interval);
  }, [token]);

  // Center map when location changes
  useEffect(() => {
    if (mapRef.current && data?.tourist?.current_latitude && data?.tourist?.current_longitude) {
      mapRef.current.setView([data.tourist.current_latitude, data.tourist.current_longitude], 16, { animate: true });
    }
  }, [data?.tourist?.current_latitude, data?.tourist?.current_longitude]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000', color: '#fff' }}>Connecting securely...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#fff', background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--error)', marginBottom: '16px' }}>location_disabled</span>
        <h2 style={{ margin: '0 0 16px 0' }}>Access Denied</h2>
        <p style={{ color: '#999' }}>{error || 'This live tracking link is invalid, revoked, or the tourist has disabled sharing.'}</p>
      </div>
    );
  }

  const { tourist, sos_active } = data;
  const hasLocation = tourist.current_latitude && tourist.current_longitude;

  return (
    <div style={{ background: 'var(--surface-container-lowest, #111)', minHeight: '100vh', color: 'var(--on-surface, #fff)', fontFamily: 'var(--font-family, sans-serif)', maxWidth: '600px', margin: '0 auto', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface, #1e1e1e)', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--outline-variant, #333)' }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '2px', color: 'var(--on-surface-variant, #aaa)' }}>TOURIST GUARDIAN</h1>
      </div>

      {/* Emergency Banner */}
      {sos_active && (
        <div style={{ background: 'var(--error, #dc2626)', color: '#fff', padding: '16px', textAlign: 'center', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 20 }}>
            <span className="material-symbols-outlined icon-filled" style={{ animation: 'pulse 1.5s infinite' }}>warning</span>
            EMERGENCY ACTIVE
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.9 }}>An emergency alert has been activated.</div>
        </div>
      )}

      <div style={{ padding: '20px' }}>
        
        {/* Tourist Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: 28 }}>{tourist.name}</h2>
            <div style={{ fontFamily: 'monospace', color: 'var(--on-surface-variant, #aaa)', fontSize: 13 }}>ID: {tourist.safety_id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              display: 'inline-block',
              padding: '6px 12px', borderRadius: '4px', fontSize: 13, fontWeight: 700, marginBottom: '8px',
              background: tourist.current_safety_severity === 'CRITICAL' ? 'var(--error, #dc2626)' : tourist.current_safety_severity === 'HIGH' ? 'var(--caution, #ca8a04)' : 'var(--safe-container, #dcfce7)',
              color: tourist.current_safety_severity === 'CRITICAL' ? '#fff' : tourist.current_safety_severity === 'HIGH' ? '#fff' : 'var(--safe, #16a34a)'
            }}>
              {tourist.current_safety_severity || 'SAFE'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Score: {tourist.current_safety_score || 100}/100</div>
          </div>
        </div>

        {/* Map */}
        <div style={{ background: 'var(--surface, #1e1e1e)', borderRadius: '16px', border: '1px solid var(--outline-variant, #333)', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--outline-variant, #333)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant, #aaa)', letterSpacing: '1px' }}>LIVE LOCATION</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, color: 'var(--safe, #16a34a)', fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: 'pulse 2s infinite' }} />
              ACTIVE
            </div>
          </div>
          
          <div style={{ height: '300px', background: '#333' }}>
            {hasLocation ? (
              <MapContainer 
                center={[tourist.current_latitude, tourist.current_longitude]} 
                zoom={16} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                ref={mapRef}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <Marker 
                  position={[tourist.current_latitude, tourist.current_longitude]}
                  icon={getMarkerIcon(tourist.current_safety_severity, sos_active)}
                >
                  <Popup>
                    <div style={{ fontWeight: 600 }}>{tourist.name}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{tourist.current_location_text || 'Current Location'}</div>
                  </Popup>
                </Marker>
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
                Waiting for GPS signal...
              </div>
            )}
          </div>
          
          <div style={{ padding: '16px', background: 'var(--surface-variant, #2a2a2a)', fontSize: 13, display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant, #aaa)' }}>
            <div>
              <div style={{ marginBottom: 4 }}>Last updated:</div>
              <div style={{ color: '#fff' }}>
                {tourist.last_location_update ? new Date(tourist.last_location_update).toLocaleString() : 'Just now'}
              </div>
            </div>
            {tourist.current_location_text && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: 4 }}>Current Area:</div>
                <div style={{ color: '#fff', fontWeight: 500 }}>{tourist.current_location_text}</div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
          This is a secure, limited view intended only for trusted family members. Location updates automatically. To report an emergency, contact local authorities immediately.
        </div>

      </div>
    </div>
  );
}
