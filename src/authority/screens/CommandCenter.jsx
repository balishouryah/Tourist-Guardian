import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { useAuthorityAuth } from '../utils/AuthorityAuthContext';
import { formatRelativeTime } from '../../utils/timeUtils';
import './CommandCenter.css';

export default function CommandCenter() {
  const navigate = useNavigate();
  const { realtimeIncidents, activeTourists } = useAuthorityRealtime();
  const { authorityProfile } = useAuthorityAuth();

  // Create a tourist-centric array
  const mappedTourists = useMemo(() => {
    const allIncidentsArray = Object.values(realtimeIncidents);
    
    return Object.values(activeTourists).map(t => {
      // Find all incidents belonging to this tourist
      const touristIncidents = allIncidentsArray.filter(
        inc => inc.tourist_id === t.id || inc.tourists?.safety_id === t.safety_id
      );
      
      const activeSOSList = touristIncidents.filter(inc => ['ACTIVE', 'ACKNOWLEDGED'].includes(inc.status));
      const hasActiveSOS = activeSOSList.length > 0;
      
      // Calculate Priority
      let priority = 'SAFE';
      let priorityScore = 0;
      
      if (hasActiveSOS) {
        priority = 'ACTIVE SOS';
        priorityScore = 4;
      } else if (t.current_safety_severity === 'CRITICAL') {
        priority = 'CRITICAL';
        priorityScore = 5; // Critical AI score without SOS is still highest priority
      } else if (t.current_safety_severity === 'HIGH') {
        priority = 'HIGH';
        priorityScore = 3;
      } else if (t.current_safety_severity === 'CAUTION') {
        priority = 'CAUTION';
        priorityScore = 2;
      } else {
        priority = t.current_safety_severity || 'SAFE';
        priorityScore = priority === 'SAFE' ? 1 : 0;
      }
      
      // Find the most recent activity timestamp for sorting
      // Either their last location update, their last seen heartbeat, or their most recent incident
      let lastActivityTime = Math.max(
        t.last_location_update ? new Date(t.last_location_update).getTime() : 0,
        t.last_seen ? new Date(t.last_seen).getTime() : 0
      );
      if (touristIncidents.length > 0) {
        const latestIncTime = Math.max(...touristIncidents.map(i => new Date(i.updated_at || i.created_at).getTime()));
        if (latestIncTime > lastActivityTime) lastActivityTime = latestIncTime;
      }

      // Latest SOS specifically for display
      let latestSOSTimeStr = null;
      if (touristIncidents.length > 0) {
        const latestInc = [...touristIncidents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        latestSOSTimeStr = formatRelativeTime(latestInc.created_at);
      }

      return {
        id: t.id,
        safety_id: t.safety_id,
        name: t.name,
        location: t.current_latitude && t.current_longitude ? `${t.current_latitude.toFixed(4)}, ${t.current_longitude.toFixed(4)}` : 'Unknown',
        last_update_str: formatRelativeTime(new Date(Math.max(
          t.last_location_update ? new Date(t.last_location_update).getTime() : 0,
          t.last_seen ? new Date(t.last_seen).getTime() : 0
        )).toISOString()),
        priority,
        priorityScore,
        lastActivityTime,
        score: t.current_safety_score || 100,
        severity: t.current_safety_severity || 'SAFE',
        activeSOSCount: activeSOSList.length,
        totalSOSCount: touristIncidents.length,
        latestSOSTimeStr
      };
    }).sort((a, b) => {
      // Sort by priority first
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // Then by most recent activity
      return b.lastActivityTime - a.lastActivityTime;
    });
  }, [activeTourists, realtimeIncidents]);


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
          <div className="command-stat-value danger">{Object.values(realtimeIncidents).length}</div>
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
              Tourist Operations Queue
            </h2>
          </div>
          
          <div className="command-alerts-list">
            {mappedTourists.map((t) => (
              <div className="command-alert-item" key={t.id} onClick={() => navigate(`/authority/tourist/${t.id}`)} style={{ borderLeft: `4px solid ${t.priorityScore >= 4 ? 'var(--error)' : t.priorityScore === 3 ? 'var(--caution)' : 'transparent'}` }}>
                <div className={`command-alert-icon ${t.priorityScore >= 4 ? 'critical' : t.priorityScore === 3 ? 'warning' : 'info'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {t.priorityScore >= 4 ? 'emergency' : t.priorityScore === 3 ? 'warning' : 'person'}
                  </span>
                </div>
                <div className="command-alert-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div className="command-alert-title">{t.name}</div>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--on-surface-variant)' }}>
                      {t.safety_id}
                    </span>
                    {t.activeSOSCount > 0 && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                        background: 'var(--error)', color: '#fff'
                      }}>
                        ACTIVE SOS: {t.activeSOSCount}
                      </span>
                    )}
                  </div>
                  <div className="command-alert-desc">
                    GPS: {t.location} • Last update: {t.last_update_str}
                  </div>
                  {t.latestSOSTimeStr && (
                    <div className="command-alert-desc" style={{ marginTop: '4px', color: 'var(--error)' }}>
                      Latest SOS: {t.latestSOSTimeStr} • Total SOS Events: {t.totalSOSCount}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: t.priorityScore >= 4 ? 'var(--error)' : t.priorityScore === 3 ? 'var(--caution)' : 'var(--on-surface-variant)' }}>
                    {t.priority}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Score: {t.score}/100</div>
                </div>
              </div>
            ))}
            
            {mappedTourists.length === 0 && (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                No active tourists being monitored.
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
