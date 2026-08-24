import { useNavigate } from 'react-router-dom';
import { DEMO_ITINERARY } from '../../utils/constants';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useDemoSimulation } from '../../utils/useDemoSimulation';
import { useAuth } from '../../utils/AuthContext';
import { useLiveLocation } from '../../utils/LocationContext';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { incident, resetDemo } = useSharedDemoState();
  const { advanceSimulation, currentStage, resetSimulation } = useDemoSimulation();
  
  // Use profile directly from context, which enforces the state machine
  const { touristProfile: profile, loading } = useAuth();
  
  const { 
    currentLoc, 
    gpsStatus, 
    tracking, 
    requestPermissionAndStart, 
    stopTracking,
    isDemoMode
  } = useLiveLocation();

  // The only reason profile would be null here (if not loading) is if NO_PROFILE
  const profileError = !loading && profile === null;

  const score = incident.score;
  const scoreColor = score >= 80 ? 'var(--safe)' : score >= 50 ? 'var(--caution)' : 'var(--error)';

  let scoreLabel = 'SAFE';
  let scoreIcon = 'check_circle';
  if (score < 40) {
    scoreLabel = 'CRITICAL';
    scoreIcon = 'emergency';
  } else if (score < 60) {
    scoreLabel = 'HIGH RISK';
    scoreIcon = 'warning';
  } else if (score < 80) {
    scoreLabel = 'CAUTION';
    scoreIcon = 'info';
  }

  if (profileError) {
    return (
      <div className="dashboard-screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'var(--space-xl)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--error)', marginBottom: 'var(--space-md)' }}>error</span>
        <h2 style={{ fontSize: 24, marginBottom: 'var(--space-sm)' }}>Profile Not Found</h2>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)' }}>
          Your safety profile could not be loaded or is not linked to this account. 
          Please complete your setup to continue using Tourist Guardian.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/tourist/onboarding')}>
          Complete Profile Setup
        </button>
      </div>
    );
  }

  if (!profile) return <div className="dashboard-screen" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>;

  // Status text for Location
  let locText = 'Unknown';
  if (currentLoc.latitude) {
    locText = `${currentLoc.latitude.toFixed(5)}, ${currentLoc.longitude.toFixed(5)}`;
  }
  
  return (
    <div className="dashboard-screen">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <p className="dashboard-greeting">Welcome back,</p>
          <h1 className="dashboard-name">{profile.name}</h1>
        </div>
        <div className="dashboard-id-badge" onClick={() => navigate('/tourist/credential')} style={{cursor: 'pointer'}}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: 'var(--secondary)' }}>
            verified_user
          </span>
          {profile.safety_id || profile.id}
        </div>
      </div>

      {/* Safety Score */}
      <div className="dashboard-score-card">
        <p className="dashboard-score-label">Safety Score</p>
        <div className="dashboard-score-row">
          <span className="dashboard-score-number" style={{ color: scoreColor }}>{score}</span>
          <span className="dashboard-score-max">/100</span>
        </div>
        <span className="dashboard-score-status" style={{ color: scoreColor }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>
            {scoreIcon}
          </span>
          {scoreLabel}
        </span>
        <div className="dashboard-score-bar">
          <div
            className="dashboard-score-fill"
            style={{ width: `${score}%`, background: scoreColor }}
          />
        </div>
      </div>

      {/* Status Grid */}
      <div className="dashboard-status-grid">
        <div className="dashboard-status-card">
          <div className="dashboard-status-icon-row">
            <span className="material-symbols-outlined dashboard-status-icon">my_location</span>
            <span className="dashboard-status-label">Location</span>
          </div>
          <p className="dashboard-status-value">{isDemoMode ? 'Shillong City (Demo)' : 'Active Tracking'}</p>
        </div>

        <div className="dashboard-status-card">
          <div className="dashboard-status-icon-row">
            <span className="material-symbols-outlined dashboard-status-icon">shield</span>
            <span className="dashboard-status-label">Area Risk</span>
          </div>
          <p className="dashboard-status-value safe">Low</p>
        </div>

        <div className="dashboard-status-card">
          <div className="dashboard-status-icon-row">
            <span className="material-symbols-outlined dashboard-status-icon">signal_cellular_alt</span>
            <span className="dashboard-status-label">Connectivity</span>
          </div>
          <p className="dashboard-status-value safe">Good</p>
        </div>

        <div className="dashboard-status-card">
          <div className="dashboard-status-icon-row">
            <span className="material-symbols-outlined dashboard-status-icon">schedule</span>
            <span className="dashboard-status-label">Next Check-in</span>
          </div>
          <p className="dashboard-status-value">09:45 AM</p>
        </div>
      </div>

      {/* Live Tracking Widget */}
      <div className="dashboard-status-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 'var(--space-md)' }}>
        <div className="dashboard-status-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="dashboard-status-icon-row" style={{ marginBottom: 0 }}>
              <span className="material-symbols-outlined dashboard-status-icon" style={{ color: tracking ? 'var(--safe)' : 'var(--on-surface-variant)' }}>
                radar
              </span>
              <span className="dashboard-status-label" style={{ fontWeight: 'bold' }}>Live Location</span>
            </div>
            {isDemoMode ? (
               <span className="badge badge-info">DEMO GPS</span>
            ) : tracking ? (
               <span className="badge badge-safe">
                 <span className="material-symbols-outlined" style={{ fontSize: 12, marginRight: '4px' }}>circle</span>
                 LIVE
               </span>
            ) : gpsStatus === 'DENIED' ? (
               <span className="badge" style={{ background: 'var(--error)', color: 'white' }}>DENIED</span>
            ) : (
               <span className="badge" style={{ background: 'var(--surface-variant)', color: 'var(--on-surface-variant)' }}>STOPPED</span>
            )}
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
            {isDemoMode ? (
              <>Demo mode uses simulated coordinates for testing.<br/><b>{locText}</b></>
            ) : tracking && currentLoc.latitude ? (
              <>
                <strong>{locText}</strong><br/>
                Accuracy: ±{Math.round(currentLoc.accuracy)}m
              </>
            ) : gpsStatus === 'PERMISSION_REQUIRED' ? (
              "Waiting for permission..."
            ) : gpsStatus === 'DENIED' ? (
              "Location permission denied. Please enable in browser settings."
            ) : gpsStatus === 'UNAVAILABLE' ? (
              "Geolocation is not supported by your browser."
            ) : (
              "Enable live location for real-time safety monitoring."
            )}
          </div>

          {!isDemoMode && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {!tracking ? (
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: '8px', fontSize: '14px' }}
                  onClick={requestPermissionAndStart}
                  disabled={gpsStatus === 'UNAVAILABLE' || gpsStatus === 'PERMISSION_REQUIRED'}
                >
                  Enable GPS
                </button>
              ) : (
                <button 
                  className="btn" 
                  style={{ flex: 1, padding: '8px', fontSize: '14px', background: 'var(--surface-variant)', color: 'var(--on-surface-variant)' }}
                  onClick={stopTracking}
                >
                  Stop
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Preview */}
      <div className="dashboard-map-card">
        <div className="dashboard-map-header">
          <span className="dashboard-map-title">
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>map</span>
            Live Route
          </span>
          <button className="dashboard-map-link" onClick={() => navigate('/tourist/map')}>
            Open Map
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          </button>
        </div>
        <div className="dashboard-map-body">
          <div className="dashboard-map-route-line" />
          <div className="dashboard-map-dot" />
        </div>
      </div>

      {/* Journey Progress */}
      <div className="dashboard-journey-card">
        <div className="dashboard-journey-header">
          <span className="dashboard-journey-title">{DEMO_ITINERARY.name}</span>
          <span className="badge badge-info" style={{ fontSize: 11 }}>In Progress</span>
        </div>
        <div className="dashboard-journey-progress-bar">
          <div className="dashboard-journey-progress-fill" />
        </div>
        <div className="dashboard-journey-stops">
          {DEMO_ITINERARY.stops.map((stop, i) => (
            <span key={i} className={`dashboard-journey-stop${i === 0 ? ' active' : ''}`}>
              {stop.name.split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Demo navigation links */}
      <div className="dashboard-demo-links">
        <button className="dashboard-demo-link" onClick={() => navigate('/tourist/area-warning')}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--caution)' }}>warning</span>
          Area Warning
        </button>
        <button 
          className="dashboard-demo-link" 
          onClick={() => {
            advanceSimulation();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>skip_next</span>
          Advance Simulation (Risk: {currentStage.key})
        </button>
        <button 
          className="dashboard-demo-link" 
          onClick={() => {
            resetDemo();
            resetSimulation();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          Reset Demo
        </button>
      </div>

      {/* SOS Button */}
      <div className="dashboard-sos-wrap">
        <button className="dashboard-sos-btn" onClick={() => navigate('/tourist/sos')}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22 }}>
            emergency_share
          </span>
          PRESS & HOLD SOS
        </button>
        <p className="dashboard-sos-hint">Press and hold for 3 seconds to activate emergency mode</p>
      </div>
    </div>
  );
}
