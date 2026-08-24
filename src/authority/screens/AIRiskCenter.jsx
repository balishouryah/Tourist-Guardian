import { useNavigate } from 'react-router-dom';
import { DEMO_INCIDENTS } from '../../utils/constants';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import './AIRiskCenter.css';

export default function AIRiskCenter() {
  const navigate = useNavigate();
  const { incident } = useSharedDemoState();

  // Combine static demo incidents with the dynamic shared incident.
  // We filter out the static TG-1042 so we can replace it with the dynamic one if active.
  const staticIncidents = DEMO_INCIDENTS.filter(inc => inc.id !== 'TG-1042');
  const activeIncidents = incident.active 
    ? [
        {
          id: incident.id,
          touristId: incident.touristId,
          touristName: incident.touristName,
          severity: incident.severity,
          location: incident.location,
          time: 'Just now',
          signals: incident.signals,
          score: incident.score
        },
        ...staticIncidents
      ]
    : staticIncidents;

  return (
    <div className="ai-risk-center">
      {/* Sidebar: Priority Incidents */}
      <div className="ai-risk-sidebar">
        <div className="ai-risk-sidebar-header">
          <span className="ai-risk-sidebar-title">Priority Alerts</span>
          <span className="ai-risk-badge">{activeIncidents.length} Active</span>
        </div>
        
        <div className="ai-risk-list">
          {activeIncidents.map((inc) => (
            <div 
              key={inc.id} 
              className={`ai-risk-incident-card ${inc.severity.toLowerCase()}`}
              onClick={() => navigate(`/authority/incident/${inc.id}`)}
            >
              <div className="ai-risk-card-header">
                <span className="ai-risk-card-title">{inc.touristName}</span>
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
                    navigate(`/authority/incident/${inc.id}`);
                  }}
                >
                  Inspect
                </button>
              </div>
            </div>
          ))}
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
