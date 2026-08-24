import { useNavigate } from 'react-router-dom';
import { DEMO_ITINERARY } from '../../utils/constants';
import './PlanJourney.css';

export default function PlanJourney() {
  const navigate = useNavigate();
  const itin = DEMO_ITINERARY;

  return (
    <div className="journey-screen">
      {/* Header */}
      <h1 className="journey-title">Planned Journey Setup</h1>
      <p className="journey-subtitle">
        Configure your itinerary for proactive deviation detection and safety monitoring.
      </p>

      {/* Trip info card */}
      <div className="journey-info-card">
        <div className="journey-info-left">
          <h2>{itin.name}</h2>
          <p className="journey-info-meta">
            Expected Duration: {itin.duration} • {itin.date} • {itin.terrain}
          </p>
        </div>
        <button className="journey-add-stop">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Add Stop
        </button>
      </div>

      {/* Timeline */}
      <div className="journey-timeline">
        {itin.stops.map((stop, i) => (
          <div className="journey-stop" key={i}>
            <div className="journey-stop-icon">
              <span className="material-symbols-outlined icon-filled">{stop.icon}</span>
            </div>
            <div className="journey-stop-header">
              <div>
                <p className="journey-stop-name">{stop.name}</p>
                <p className="journey-stop-type">{stop.type}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="journey-stop-time">{stop.time}</p>
                <p className={`journey-stop-status ${stop.status.toLowerCase()}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 2 }}>
                    {stop.status === 'Confirmed' ? 'check_circle' : 'schedule'}
                  </span>
                  {stop.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Map preview (placeholder for Stage 4) */}
      <div className="journey-map-preview">
        <div className="journey-map-overlay">
          <span className="material-symbols-outlined icon-filled">map</span>
          <span>Route preview — full map in Stage 4</span>
        </div>
      </div>

      {/* Stats */}
      <div className="journey-stats">
        <div>
          <p className="journey-stat-label">Total Distance</p>
          <p className="journey-stat-value">{itin.totalDistance}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="journey-stat-label">Risk Level</p>
          <p className="journey-stat-value safe">
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 2 }}>
              verified_user
            </span>
            Low
          </p>
        </div>
      </div>

      {/* Active Deviation Monitoring */}
      <div className="journey-monitoring">
        <span className="material-symbols-outlined journey-monitoring-icon" style={{ fontSize: 24 }}>
          radar
        </span>
        <div>
          <p className="journey-monitoring-title">Active Deviation Monitoring</p>
          <p className="journey-monitoring-text">AI Guardian is analyzing this route.</p>
        </div>
      </div>

      {/* Start Journey */}
      <div className="journey-cta">
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={() => navigate('/tourist/dashboard')}
        >
          Start Journey
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            navigation
          </span>
        </button>
      </div>
    </div>
  );
}
