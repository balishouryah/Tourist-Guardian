import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import LiveTouristLeaflet from '../components/LiveTouristLeaflet';
import './AuthorityMap.css';

export default function AuthorityMap() {
  const navigate = useNavigate();
  const { realtimeIncidents, activeTourists } = useAuthorityRealtime();

  const [filter, setFilter] = useState('ALL'); // ALL, ONLINE, SOS, HIGH RISK
  const [selectedTouristId, setSelectedTouristId] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  const [layerMode, setLayerMode] = useState('MARKERS'); // 'MARKERS', 'HEATMAP', 'BOTH'
  const [heatType, setHeatType] = useState('TOURIST'); // 'TOURIST', 'INCIDENT'

  const mappedRealtimeIncidents = Object.values(realtimeIncidents).map(inc => ({
    id: inc.id,
    touristId: inc.tourists?.safety_id || inc.tourist_id,
    touristName: inc.tourists?.name || 'Unknown',
    severity: inc.severity,
    status: inc.status,
    lat: inc.latitude,
    lng: inc.longitude
  }));

  const allActiveIncidents = mappedRealtimeIncidents;

  // Map activeTourists into UI format, injecting severity from incidents
  const mappedActiveTourists = Object.values(activeTourists).map(t => {
    // Find if this tourist has an active incident
    const activeInc = allActiveIncidents.find(inc => inc.touristId === t.id || inc.touristId === t.safety_id);
    let severity = t.current_safety_severity || 'SAFE';
    
    if (activeInc && (activeInc.severity === 'CRITICAL' || activeInc.severity === 'HIGH')) {
        severity = activeInc.severity;
    }

    return {
      id: t.id,
      safety_id: t.safety_id || t.id,
      name: t.name || 'Unknown',
      lat: t.current_latitude,
      lng: t.current_longitude,
      last_location_update: t.last_location_update,
      last_seen: t.last_seen,
      severity: severity,
      isDemo: false
    };
  });

  const metrics = useMemo(() => {
    let online = mappedActiveTourists.length;
    let sos = mappedActiveTourists.filter(t => t.severity === 'CRITICAL').length;
    let highRisk = mappedActiveTourists.filter(t => ['HIGH_RISK', 'CAUTION'].includes(t.severity)).length;
    return { online, sos, highRisk };
  }, [mappedActiveTourists]);

  const filteredTourists = useMemo(() => {
    if (filter === 'ALL') return mappedActiveTourists;
    if (filter === 'ONLINE') return mappedActiveTourists.filter(t => t.severity === 'SAFE');
    if (filter === 'SOS') return mappedActiveTourists.filter(t => t.severity === 'CRITICAL');
    if (filter === 'HIGH RISK') return mappedActiveTourists.filter(t => ['HIGH_RISK', 'CAUTION'].includes(t.severity));
    return mappedActiveTourists;
  }, [filter, mappedActiveTourists]);

  // Derived state for the selected tourist panel
  const selectedTourist = useMemo(() => {
    if (!selectedTouristId) return null;
    return mappedActiveTourists.find(t => t.id === selectedTouristId);
  }, [selectedTouristId, mappedActiveTourists]);

  const getLiveStatus = (lastUpdateStr, currentTime) => {
    if (!lastUpdateStr) return { status: 'OFFLINE', text: 'Unknown', color: 'var(--on-surface-variant)', bg: 'var(--surface-variant)' };
    const diffMins = Math.floor((currentTime - new Date(lastUpdateStr).getTime()) / 60000);
    if (diffMins < 2) return { status: 'LIVE', text: diffMins === 0 ? 'Just now' : `${diffMins}m ago`, color: '#16a34a', bg: '#dcfce7' };
    if (diffMins <= 5) return { status: 'STALE', text: `${diffMins}m ago`, color: 'var(--caution)', bg: 'var(--caution-bg)' };
    return { status: 'OFFLINE', text: `>5m ago`, color: 'var(--on-surface-variant)', bg: 'var(--surface-variant)' };
  };

  // oxlint-disable-next-line react/purity
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    // oxlint-disable-next-line react/purity
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedLiveInfo = selectedTourist 
    ? getLiveStatus(
        selectedTourist.last_seen || selectedTourist.last_location_update
          ? Math.max(
              selectedTourist.last_seen ? new Date(selectedTourist.last_seen).getTime() : 0, 
              selectedTourist.last_location_update ? new Date(selectedTourist.last_location_update).getTime() : 0
            ) 
          : null,
        currentTime
      ) 
    : null;

  return (
    <div className="authority-map-screen">
      <div className="authority-map-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Header */}
        <div className="authority-map-header">
          <div className="authority-map-title">
            <span className="material-symbols-outlined icon-filled">public</span>
            LIVE TOURIST MAP
          </div>
          
          <div className="authority-map-metrics">
            <div className="metric-badge safe">
              <strong>{metrics.online}</strong> ONLINE
            </div>
            <div className="metric-badge critical">
              <strong>{metrics.sos}</strong> ACTIVE SOS
            </div>
            <div className="metric-badge caution">
              <strong>{metrics.highRisk}</strong> HIGH RISK
            </div>
          </div>

          <div className="authority-map-actions">
            {['ALL', 'ONLINE', 'SOS', 'HIGH RISK'].map(f => (
              <button 
                key={f} 
                className={`authority-map-action-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Map Area */}
        <div className="authority-map-view" style={{ flex: 1, padding: 0, position: 'relative' }}>
          
          {mappedActiveTourists.length === 0 ? (
            <div className="authority-map-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: '16px' }}>location_off</span>
              <h2>NO LIVE TOURISTS</h2>
              <p>No active Tourist locations are currently available.</p>
            </div>
          ) : (
            <LiveTouristLeaflet 
              tourists={filteredTourists}
              incidents={allActiveIncidents}
              selectedTouristId={selectedTouristId}
              onTouristSelect={(id) => {
                setSelectedTouristId(id);
                setFollowMode(false);
              }}
              followMode={followMode}
              triggerFitBounds={fitBoundsTrigger}
              layerMode={layerMode}
              heatType={heatType}
            />
          )}

          {/* Selected Tourist Side Panel */}
          {selectedTourist && (
            <div className="authority-tourist-panel">
              <button className="panel-close-btn" onClick={() => { setSelectedTouristId(null); setFollowMode(false); }}>
                <span className="material-symbols-outlined">close</span>
              </button>
              
              <div className="panel-header">
                <h3>{selectedTourist.name.toUpperCase()} {selectedTourist.isDemo && '(DEMO)'}</h3>
                {selectedTourist.severity === 'CRITICAL' && (
                  <div className="panel-sos-badge">🔴 ACTIVE SOS</div>
                )}
              </div>
              
              <div className="panel-info-row">
                <span className="label">Safety ID</span>
                <span className="value monospace">{selectedTourist.safety_id}</span>
              </div>
              
              <div className="panel-info-row">
                <span className="label">Live Location</span>
                <span className="value monospace">{selectedTourist.lat.toFixed(4)}, {selectedTourist.lng.toFixed(4)}</span>
              </div>

              <div className="panel-info-row">
                <span className="label">GPS Status</span>
                <span className="value live-status-pill" style={{ background: selectedLiveInfo.bg, color: selectedLiveInfo.color }}>
                  {selectedLiveInfo.status === 'LIVE' ? '🟢 ' : (selectedLiveInfo.status === 'STALE' ? '🟠 ' : '🔴 ')}
                  {selectedLiveInfo.status}
                </span>
              </div>
              
              <div className="panel-info-row">
                <span className="label">Updated</span>
                <span className="value">{selectedLiveInfo.text}</span>
              </div>

              <div className="panel-actions">
                {selectedTourist.severity === 'CRITICAL' && (
                  <button className="panel-btn critical-btn" onClick={() => {
                    navigate(`/authority/tourist/${selectedTourist.id}`);
                  }}>
                    VIEW DETAILS
                  </button>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button className="panel-btn secondary-btn" style={{ flex: 1 }} onClick={() => setFollowMode(!followMode)}>
                    {followMode ? 'STOP FOLLOW' : 'FOLLOW'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Global Map Controls */}
          <div className="authority-map-global-controls" style={{ display: 'flex', flexDirection: 'column', gap: '8px', right: '20px', bottom: '20px' }}>
            <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>MAP LAYERS</div>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="layerMode" checked={layerMode === 'MARKERS'} onChange={() => setLayerMode('MARKERS')} />
                Markers Only
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="layerMode" checked={layerMode === 'HEATMAP'} onChange={() => setLayerMode('HEATMAP')} />
                Heat Map Only
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="radio" name="layerMode" checked={layerMode === 'BOTH'} onChange={() => setLayerMode('BOTH')} />
                Markers + Heat Map
              </label>

              {layerMode !== 'MARKERS' && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--outline-variant)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>HEAT SOURCE</div>
                  <select 
                    value={heatType} 
                    onChange={e => setHeatType(e.target.value)}
                    style={{ width: '100%', padding: '4px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--outline)' }}
                  >
                    <option value="TOURIST">Tourist Density (Live)</option>
                    <option value="INCIDENT">Incident Density</option>
                  </select>
                </div>
              )}
            </div>

            <button className="authority-map-control-btn" onClick={() => setFitBoundsTrigger(prev => prev + 1)}>
               <span className="material-symbols-outlined">center_focus_strong</span>
               CENTER ON ALL
             </button>
          </div>

        </div>

      </div>
    </div>
  );
}
