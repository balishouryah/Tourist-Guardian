import { useSharedDemoState } from '../../utils/useSharedDemoState';
import InteractiveMap from '../../components/InteractiveMap';
import './RiskIntelligence.css';

export default function RiskIntelligence() {
  const { incident } = useSharedDemoState();

  return (
    <div className="risk-intelligence-screen">
      {/* Left: Interactive Map */}
      <div className="risk-intel-map-card">
        <div className="risk-intel-map-header">
          <div className="risk-intel-map-title">
            <span className="material-symbols-outlined icon-filled">map</span>
            Regional Risk Heatmap
          </div>
          <div className="risk-intel-map-controls">
            <span className="risk-intel-map-control active">Live Risk</span>
            <span className="risk-intel-map-control">Density</span>
            <span className="risk-intel-map-control">Weather</span>
          </div>
        </div>
        
        <div className="risk-intel-map-view" style={{ flex: 1, padding: 0 }}>
          <InteractiveMap showAuthorityView={true} incidentState={incident} />
        </div>
      </div>

      {/* Right: Sidebar Stats & Indicators */}
      <div className="risk-intel-sidebar">
        
        <div className="risk-intel-region-card">
          <h1 className="risk-intel-region-name">Meghalaya Region</h1>
          <p className="risk-intel-region-meta">Active Monitoring Sector • Northeast India</p>

          <div className="risk-intel-stats-row">
            <div className="risk-intel-stat">
              <div className="risk-intel-stat-label">Active Tourists</div>
              <div className="risk-intel-stat-value">2,841</div>
            </div>
            <div className="risk-intel-stat">
              <div className="risk-intel-stat-label">Incidents</div>
              <div className="risk-intel-stat-value" style={{ color: 'var(--error)' }}>3</div>
            </div>
          </div>
          
          <div className="risk-intel-stats-row" style={{ marginBottom: 0 }}>
            <div className="risk-intel-stat">
              <div className="risk-intel-stat-label">Risk Level</div>
              <div className="risk-intel-stat-value" style={{ color: 'var(--caution)', fontSize: '20px' }}>Elevated</div>
            </div>
            <div className="risk-intel-stat">
              <div className="risk-intel-stat-label">Density</div>
              <div className="risk-intel-stat-value" style={{ fontSize: '20px' }}>Medium</div>
            </div>
          </div>
        </div>

        <div className="risk-intel-indicators">
          <h2 className="risk-intel-indicator-title">
            <span className="material-symbols-outlined">insights</span>
            Active Risk Indicators
          </h2>
          
          <div className="risk-intel-indicator-list">
            <div className="risk-intel-indicator-item critical">
              <div className="risk-intel-indicator-icon">
                <span className="material-symbols-outlined">signal_cellular_connected_no_internet_0_bar</span>
              </div>
              <div className="risk-intel-indicator-content">
                <div className="risk-intel-indicator-label">Mawphlang Cellular Outage</div>
                <div className="risk-intel-indicator-desc">Weak network detected in Sector B</div>
              </div>
            </div>

            <div className="risk-intel-indicator-item warning">
              <div className="risk-intel-indicator-icon">
                <span className="material-symbols-outlined">rainy</span>
              </div>
              <div className="risk-intel-indicator-content">
                <div className="risk-intel-indicator-label">Flash Flood Warning</div>
                <div className="risk-intel-indicator-desc">Elephant Falls approach trail</div>
              </div>
            </div>

            <div className="risk-intel-indicator-item">
              <div className="risk-intel-indicator-icon">
                <span className="material-symbols-outlined">group_off</span>
              </div>
              <div className="risk-intel-indicator-content">
                <div className="risk-intel-indicator-label">Low Density Anomaly</div>
                <div className="risk-intel-indicator-desc">Laitlum Canyon visitor count dropped 40%</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
