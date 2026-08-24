import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { formatRelativeTime } from '../../utils/timeUtils';
import LiveTouristLeaflet from '../components/LiveTouristLeaflet';
import './AIRiskCenter.css';

export default function AIRiskCenter() {
  const navigate = useNavigate();
  const { activeTourists } = useAuthorityRealtime();
  
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CRITICAL', 'HIGH', 'CAUTION', 'SAFE'
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);

  const activeRisks = useMemo(() => {
    return Object.values(activeTourists)
      .filter(t => filter === 'ALL' || t.current_safety_severity === filter)
      .map(t => ({
        id: t.id,
        safety_id: t.safety_id,
        name: t.name,
        severity: t.current_safety_severity || 'SAFE',
        score: t.current_safety_score !== undefined ? t.current_safety_score : 100,
        location: t.current_latitude && t.current_longitude ? `${t.current_latitude.toFixed(6)}, ${t.current_longitude.toFixed(6)}` : 'Unknown',
        lat: t.current_latitude,
        lng: t.current_longitude,
        last_update_raw: t.last_location_update,
        last_location_update: t.last_location_update,
        time: formatRelativeTime(t.last_location_update),
        signals: t.current_safety_signals?.length > 0 ? t.current_safety_signals : (t.current_safety_severity === 'SAFE' ? ['No anomalies detected'] : [`AI Safety Score: ${t.current_safety_score}`])
      }))
      .sort((a, b) => {
        const severityRank = { 'CRITICAL': 4, 'HIGH': 3, 'CAUTION': 2, 'SAFE': 1 };
        const rankA = severityRank[a.severity] || 0;
        const rankB = severityRank[b.severity] || 0;
        
        if (rankA !== rankB) return rankB - rankA; // Highest severity first
        
        // Within same severity, most recently updated first
        const timeA = new Date(a.last_update_raw || 0).getTime();
        const timeB = new Date(b.last_update_raw || 0).getTime();
        return timeB - timeA;
      });
  }, [activeTourists, filter]);

  // Derived metrics
  const activeCount = Object.keys(activeTourists).length;
  
  return (
    <div className="ai-risk-center">
      {/* Sidebar: Priority Incidents */}
      <div className="ai-risk-sidebar">
        <div className="ai-risk-sidebar-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span className="ai-risk-sidebar-title">🧠 AI Behavioural Risk</span>
            <span className="ai-risk-badge">{activeRisks.length} Detected</span>
          </div>
          
          <div className="ai-risk-filters" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'CAUTION', 'SAFE'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: filter === f ? 'var(--primary)' : 'var(--surface)',
                  color: filter === f ? '#fff' : 'var(--on-surface)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        
        <div className="ai-risk-list">
          {activeRisks.map((inc) => (
            <div 
              key={inc.id} 
              className={`ai-risk-incident-card ${inc.severity.toLowerCase()}`}
              onClick={() => navigate(`/authority/tourist/${inc.id}`)}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div className="ai-risk-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                {inc.severity === 'CRITICAL' ? (
                  <div style={{ color: 'var(--error)', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>emergency</span>
                    POSSIBLE DISTRESS
                  </div>
                ) : (
                  <div style={{ 
                    color: inc.severity === 'HIGH' ? 'var(--caution)' : inc.severity === 'CAUTION' ? '#eab308' : 'var(--safe)', 
                    fontWeight: 800, fontSize: '13px', marginBottom: '4px' 
                  }}>
                    {inc.severity === 'HIGH' ? '🔴 HIGH RISK' : inc.severity === 'CAUTION' ? '🟠 CAUTION' : '🟢 SAFE'}
                  </div>
                )}
                <span className="ai-risk-card-title" style={{ fontSize: '16px' }}>{inc.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: 'monospace' }}>{inc.safety_id}</span>
              </div>
              
              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                Safety Score: <span style={{ color: inc.score < 50 ? 'var(--error)' : inc.score < 80 ? 'var(--caution)' : 'var(--safe)' }}>{inc.score}/100</span>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  AI Behavioural Signals:
                </div>
                <div className="ai-risk-card-tags" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {inc.signals.map((sig, i) => (
                    <span key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {inc.severity !== 'SAFE' && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>}
                      {sig}
                    </span>
                  ))}
                </div>
              </div>

              {inc.severity === 'CRITICAL' && (
                <div style={{ fontSize: '12px', color: 'var(--error)', fontStyle: 'italic', marginTop: '4px' }}>
                  "Multiple behavioural anomalies indicate possible distress."
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>Last location:</div>
                  <div style={{ fontFamily: 'monospace' }}>{inc.location}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>Last update:</div>
                  <div>{inc.time}</div>
                </div>
              </div>
              
              <div className="ai-risk-card-actions" style={{ marginTop: '4px' }}>
                <button 
                  className="ai-risk-btn-sm primary"
                  style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 700 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/authority/tourist/${inc.id}`);
                  }}
                >
                  VIEW TOURIST
                </button>
              </div>
            </div>
          ))}
          
          {activeRisks.length === 0 && (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              No tourists match the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* Main Area: Map and System Status */}
      <div className="ai-risk-main">
        <div className="ai-risk-map-container">
          <div className="ai-risk-map-header">
            <span className="ai-risk-map-title">
              <span className="material-symbols-outlined">public</span>
              Live Operations Map
            </span>
            <div className="ai-risk-map-filters">
              <button 
                className="ai-risk-map-filter" 
                onClick={() => setFitBoundsTrigger(prev => prev + 1)}
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '12px', fontWeight: 600, color: 'var(--primary)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>center_focus_strong</span>
                FIT ALL TOURISTS
              </button>
            </div>
          </div>
          
          <div className="ai-risk-map-view" style={{ flex: 1, padding: 0, position: 'relative' }}>
            <LiveTouristLeaflet 
              tourists={activeRisks}
              incidents={[]}
              onTouristViewAction={(id) => navigate(`/authority/tourist/${id}`)}
              triggerFitBounds={fitBoundsTrigger}
            />
          </div>
        </div>

        <div className="ai-risk-system-status">
          <div className="ai-risk-status-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--safe)' }}>lens</span>
            <div>
              <div className="ai-risk-status-label">AI Guardian System</div>
              <div className="ai-risk-status-value">Monitoring Active</div>
            </div>
          </div>
          <div className="ai-risk-status-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>group</span>
            <div>
              <div className="ai-risk-status-label">Active Tourists</div>
              <div className="ai-risk-status-value">{activeCount} monitored</div>
            </div>
          </div>
          <div className="ai-risk-status-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>update</span>
            <div>
              <div className="ai-risk-status-label">Last Refresh</div>
              <div className="ai-risk-status-value">Live (Real-time)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
