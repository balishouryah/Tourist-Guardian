import { DEMO_ITINERARY } from '../../utils/constants';
import './OfflineMode.css';

export default function OfflineMode() {
  return (
    <div className="offline-mode-screen animate-fade-in">
      <div className="offline-header">
        <div className="offline-icon-wrap">
          <span className="material-symbols-outlined" style={{ fontSize: 40 }}>
            wifi_off
          </span>
        </div>
        <h1 className="offline-title">Offline Safety Mode</h1>
        <p className="offline-subtitle">
          You are currently in a low-connectivity area. Your safety baseline is pre-cached.
        </p>
      </div>

      <div className="offline-info-list">
        <div className="offline-info-card">
          <span className="material-symbols-outlined offline-info-icon">map</span>
          <div className="offline-info-content">
            <h3>Cached Maps Available</h3>
            <p>The {DEMO_ITINERARY.name} map data is downloaded. You can still navigate safely.</p>
          </div>
        </div>

        <div className="offline-info-card">
          <span className="material-symbols-outlined offline-info-icon" style={{ color: 'var(--caution)' }}>sos</span>
          <div className="offline-info-content">
            <h3>Mesh Network SOS</h3>
            <p>If you trigger an SOS, it will attempt to broadcast over local mesh networks to nearby devices.</p>
          </div>
        </div>

        <div className="offline-info-card">
          <span className="material-symbols-outlined offline-info-icon">schedule</span>
          <div className="offline-info-content">
            <h3>Last Synced</h3>
            <p>14 minutes ago. Authorities have your last known position logged.</p>
          </div>
        </div>
      </div>

      <div className="offline-status-bar">
        <div className="offline-status-pulse" />
        <div className="offline-status-text">
          Background monitoring active
        </div>
      </div>
      
      <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', textAlign: 'center', opacity: 0.7 }}>
        This is a prototype view demonstrating offline capabilities for the hackathon.
      </p>
    </div>
  );
}
