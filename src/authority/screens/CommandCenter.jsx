import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_INCIDENTS } from '../../utils/constants';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { useAuthorityAuth } from '../utils/AuthorityAuthContext';
import './CommandCenter.css';

export default function CommandCenter() {
  const navigate = useNavigate();
  const { incident } = useSharedDemoState();
  const { realtimeIncidents, activeTourists } = useAuthorityRealtime();
  const { authorityProfile } = useAuthorityAuth();
  const [filter, setFilter] = useState('ALL');

  const staticIncidents = DEMO_INCIDENTS.filter(inc => inc.id !== 'TG-1042').map(inc => ({...inc, isDemo: true}));
  
  // Convert realtime dictionary to array and map to frontend format
  const mappedRealtime = Object.values(realtimeIncidents).map(inc => ({
    id: inc.id,
    touristId: inc.tourists?.safety_id || inc.tourist_id,
    touristName: inc.tourists?.name || 'Unknown',
    severity: inc.severity,
    status: inc.status,
    location: inc.latitude && inc.longitude ? `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}` : 'Unknown',
    time: new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    signals: inc.detected_signals || [inc.incident_type],
    score: inc.risk_score || 0,
    isDemo: false
  }));

  // Only use the broadcasted local demo incident if we don't have it in realtime
  const isDemoActiveLocally = incident.active && !mappedRealtime.some(r => r.score === incident.score && r.severity === incident.severity);

  const allIncidents = [
    ...mappedRealtime,
    ...(isDemoActiveLocally ? [{
      id: incident.id,
      touristId: incident.touristId,
      touristName: incident.touristName,
      severity: incident.severity,
      status: incident.status,
      location: incident.location,
      time: 'Just now',
      signals: incident.signals,
      score: incident.score,
      isDemo: true
    }] : []),
    ...staticIncidents
  ].sort((a, b) => {
    // Sort by severity (CRITICAL > HIGH > CAUTION > SAFE)
    const sevScore = { CRITICAL: 3, HIGH: 2, CAUTION: 1, SAFE: 0 };
    return (sevScore[b.severity] || 0) - (sevScore[a.severity] || 0);
  });

  const activeIncidents = useMemo(() => {
    if (filter === 'ALL') return allIncidents;
    if (filter === 'LIVE') return allIncidents.filter(i => !i.isDemo);
    if (filter === 'DEMO') return allIncidents.filter(i => i.isDemo);
    if (filter === 'CRITICAL') return allIncidents.filter(i => i.severity === 'CRITICAL');
    return allIncidents.filter(i => i.status === filter);
  }, [allIncidents, filter]);

  return (
    <div className="command-center">
      <div className="command-top-bar">
        <div className="command-top-logo">
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 28 }}>shield</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '0.05em' }}>TOURIST GUARDIAN</span>
            <span style={{ fontSize: 11, color: 'var(--error)', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE OPERATIONS</span>
          </div>
        </div>
        <div className="command-top-right">
          <div className="command-time">{new Date().toLocaleString()}</div>
          <div className="command-operator">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>account_circle</span>
            {authorityProfile?.display_name || 'Authority Operator'}
          </div>
        </div>
      </div>

      <div className="command-header">
        <h1 className="command-title">Emergency Response Dashboard</h1>
        <p className="command-subtitle">Meghalaya Tourism Safety Region</p>
      </div>

      <div className="command-stats-grid">
        <div className="command-stat-card" style={{ borderTop: '4px solid var(--secondary)' }}>
          <div className="command-stat-header">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
            Active Tourists
          </div>
          <div className="command-stat-value" style={{ color: 'var(--primary)', fontSize: 24, fontWeight: '700' }}>{Object.keys(activeTourists).length}</div>
          <div className="command-stat-trend">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            Online (Live GPS)
          </div>
        </div>

        <div className="command-stat-card" style={{ borderTop: '4px solid var(--error)' }}>
          <div className="command-stat-header">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>emergency_home</span>
            Live Incidents
          </div>
          <div className="command-stat-value danger">{mappedRealtime.length}</div>
          <div className="command-stat-trend negative">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>
            Active operations
          </div>
        </div>

        <div className="command-stat-card" style={{ borderTop: '4px solid var(--safe)' }}>
          <div className="command-stat-header">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>radar</span>
            Supabase Realtime
          </div>
          <div className="command-stat-value safe">Online</div>
          <div className="command-stat-trend">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
            Connected
          </div>
        </div>

        <div className="command-stat-card" style={{ borderTop: '4px solid var(--caution)' }}>
          <div className="command-stat-header">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>thermostat</span>
            Regional Risk
          </div>
          <div className="command-stat-value" style={{ color: 'var(--on-surface-variant)', fontSize: 18 }}>—</div>
          <div className="command-stat-trend">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
            Data unavailable
          </div>
        </div>
      </div>

      <div className="command-main-grid">
        <div className="command-incidents-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 className="command-section-title" style={{ margin: 0 }}>
              <span className="material-symbols-outlined">format_list_bulleted</span>
              Incident Queue
            </h2>
            <div className="command-filters">
              {['ALL', 'LIVE', 'DEMO', 'CRITICAL', 'ACTIVE'].map(f => (
                <button 
                  key={f}
                  className={`command-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="command-alerts-list">
            {activeIncidents.map((inc) => (
              <div className="command-alert-item" key={inc.id} onClick={() => navigate(`/authority/incident/${inc.id}`)}>
                <div className={`command-alert-icon ${inc.severity === 'CRITICAL' ? 'critical' : inc.severity === 'HIGH' ? 'warning' : 'info'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {inc.severity === 'CRITICAL' ? 'emergency' : 'warning'}
                  </span>
                </div>
                <div className="command-alert-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div className="command-alert-title">{inc.touristName}</div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                      background: inc.isDemo ? 'var(--secondary)' : 'var(--primary)', color: '#fff'
                    }}>
                      {inc.isDemo ? 'DEMO' : 'LIVE'}
                    </span>
                  </div>
                  <div className="command-alert-desc">
                    ID: <span style={{fontFamily: 'monospace'}}>{inc.touristId}</span> • {inc.location}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className="command-alert-time">{inc.time}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>{inc.status || inc.severity}</div>
                </div>
              </div>
            ))}
            
            {activeIncidents.length === 0 && (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                No incidents match the current filter.
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="command-section-title">
            <span className="material-symbols-outlined">map</span>
            Live Operations Map
          </h2>
          <div className="command-map-container" onClick={() => navigate('/authority/map')} style={{ cursor: 'pointer' }}>
            <div className="command-map-overlay">
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#fff' }}>map</span>
              <div style={{ color: '#fff', fontWeight: 600, marginTop: '8px' }}>Open Map</div>
            </div>
            <div style={{ background: '#bacddb', width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }}></div>
          </div>
          
          <h2 className="command-section-title" style={{ marginTop: 'var(--space-xl)' }}>
            <span className="material-symbols-outlined">bolt</span>
            Operational Tools
          </h2>
          <div className="command-actions-grid">
            <button className="command-action-btn" onClick={() => navigate('/authority/map')}>
              <div className="command-action-icon">
                <span className="material-symbols-outlined icon-filled">my_location</span>
              </div>
              <div className="command-action-title">GPS Tracking</div>
            </button>

            <button className="command-action-btn" onClick={() => navigate('/authority/dashboard')}>
              <div className="command-action-icon" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
                <span className="material-symbols-outlined icon-filled">analytics</span>
              </div>
              <div className="command-action-title">Refresh Queue</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
