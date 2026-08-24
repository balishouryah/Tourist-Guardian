import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { formatRelativeTime } from '../../utils/timeUtils';
import './AIRiskCenter.css';

export default function AIRiskCenter() {
  const navigate = useNavigate();
  const { activeTourists } = useAuthorityRealtime();

  const activeRisks = useMemo(() => {
    return Object.values(activeTourists)
      .filter(t => t.current_safety_severity === 'CRITICAL' || t.current_safety_severity === 'HIGH')
      .map(t => ({
        id: t.id,
        safety_id: t.safety_id,
        name: t.name,
        severity: t.current_safety_severity,
        score: t.current_safety_score,
        location: t.current_latitude && t.current_longitude ? `${t.current_latitude.toFixed(4)}, ${t.current_longitude.toFixed(4)}` : 'Unknown',
        time: formatRelativeTime(t.last_location_update),
        signals: [`AI Safety Score: ${t.current_safety_score}`]
      }))
      .sort((a, b) => {
        const sA = a.severity === 'CRITICAL' ? 2 : 1;
        const sB = b.severity === 'CRITICAL' ? 2 : 1;
        if (sB !== sA) return sB - sA;
        return a.score - b.score; // Lower score is higher risk
      });
  }, [activeTourists]);

  return (
    <div className="ai-risk-center">
      {/* Sidebar: Priority Incidents */}
      <div className="ai-risk-sidebar">
        <div className="ai-risk-sidebar-header">
          <span className="ai-risk-sidebar-title">AI Priority Alerts</span>
          <span className="ai-risk-badge">{activeRisks.length} Detected</span>
        </div>
        
        <div className="ai-risk-list">
          {activeRisks.map((inc) => (
            <div 
              key={inc.id} 
              className={`ai-risk-incident-card ${inc.severity.toLowerCase()}`}
              onClick={() => navigate(`/authority/tourist/${inc.id}`)}
            >
              <div className="ai-risk-card-header">
                <span className="ai-risk-card-title">{inc.name}</span>
                <span className="ai-risk-card-time">{inc.time}</span>
              </div>
              <div className="ai-risk-card-location">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                {inc.location}
              </div>
              
              <div className="ai-risk-card-tags">
                {inc.signals.map((sig, i) => (
                  <span key={i} className="ai-risk-card-tag">{sig}</span>
                ))}
              </div>
              
              <div className="ai-risk-card-actions">
                <button 
                  className="ai-risk-btn-sm primary"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent card click
                    navigate(`/authority/tourist/${inc.id}`);
                  }}
                >
                  Inspect
                </button>
              </div>
            </div>
          ))}
          
          {activeRisks.length === 0 && (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              No critical AI risks detected.
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
              <span className="ai-risk-map-filter active">All Active</span>
              <span className="ai-risk-map-filter">Critical Only</span>
            </div>
          </div>
          
          <div className="ai-risk-map-view">
            {/* Map Placeholder for Stage 4 */}
            <div style={{ textAlign: 'center', color: 'var(--surface-tint)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: '8px' }}>map</span>
              <p style={{ fontSize: 14, fontWeight: 500, letterSpacing: '0.02em' }}>Interactive Map Loading (Stage 4)</p>
            </div>
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
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>router</span>
            <div>
              <div className="ai-risk-status-label">Signal Coverage</div>
              <div className="ai-risk-status-value">92% Regional</div>
            </div>
          </div>
          <div className="ai-risk-status-item">
            <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>update</span>
            <div>
              <div className="ai-risk-status-label">Last Refresh</div>
              <div className="ai-risk-status-value">Just now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
