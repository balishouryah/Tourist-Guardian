import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_ITINERARY } from '../../utils/constants';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useDemoSimulation } from '../../utils/useDemoSimulation';
import { useAuth } from '../../utils/AuthContext';
import { useLiveLocation } from '../../utils/LocationContext';
import { useSafetyContext } from '../../utils/SafetyContext';
import { useOfflineStatus } from '../../utils/useOfflineStatus';
import EmergencyPoliceButton from '../../components/EmergencyPoliceButton';
import { getOfflineData } from '../../services/offlineService';
import { getDownloadedRegions } from '../../services/offlineMapService';
import { useLanguage } from '../../utils/LanguageContext';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { incident, resetDemo } = useSharedDemoState();
  const { advanceSimulation, currentStage, resetSimulation } = useDemoSimulation();
  
  const { touristProfile: profile, loading } = useAuth();
  const liveSafety = useSafetyContext();
  
  const { 
    currentLoc, 
    gpsStatus, 
    tracking, 
    requestPermissionAndStart, 
    stopTracking,
    isDemoMode
  } = useLiveLocation();
  
  const { isOnline, pendingSOSCount, syncOfflineData } = useOfflineStatus();

  const profileError = !loading && profile === null;

  // Determine which score to display
  const score = isDemoMode ? incident.score : (liveSafety?.score ?? 100);
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
      {pendingSOSCount > 0 && (
        <div style={{ backgroundColor: 'var(--error)', color: 'white', padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>cloud_off</span>
          {pendingSOSCount} {t('pending_sos')}
        </div>
      )}
      {!isOnline && pendingSOSCount === 0 && (
        <div style={{ backgroundColor: 'var(--caution-bg)', color: 'var(--caution)', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
          {t('offline_mode')}
        </div>
      )}
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
        <p className="dashboard-score-label">{t('safety_score')}</p>
        <div className="dashboard-score-row">
          <span className="dashboard-score-number" style={{ color: scoreColor }}>{score}</span>
          <span className="dashboard-score-max">/100</span>
        </div>
        <span className="dashboard-score-status" style={{ color: scoreColor }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>
            {scoreIcon}
          </span>
          {t(scoreLabel.toLowerCase().replace(' risk', ''))}
        </span>
        <div className="dashboard-score-bar">
          <div
            className="dashboard-score-fill"
            style={{ width: `${score}%`, background: scoreColor }}
          />
        </div>
        
        {/* Render Live Safety Signals */}
        {!isDemoMode && liveSafety?.signals?.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--outline-variant)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Detected Risk Factors</span>
            {liveSafety.signals.map((signal, idx) => (
              <div key={idx} style={{ fontSize: 13, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--caution)' }}>priority_high</span>
                {signal}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety Zone Status (LIVE MODE ONLY) */}
      {!isDemoMode && (
        <div className="card" style={{ marginBottom: '16px', padding: 0, overflow: 'hidden', border: `1px solid ${liveSafety?.currentZone?.type === 'DANGER' ? 'var(--error)' : liveSafety?.currentZone?.type === 'CAUTION' ? 'var(--caution)' : 'var(--safe)'}` }}>
          <div style={{ padding: '12px 16px', background: liveSafety?.currentZone?.type === 'DANGER' ? 'var(--error-container)' : liveSafety?.currentZone?.type === 'CAUTION' ? 'var(--caution-bg)' : 'var(--safe-bg)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: liveSafety?.currentZone?.type === 'DANGER' ? 'var(--on-error-container)' : liveSafety?.currentZone?.type === 'CAUTION' ? 'var(--caution)' : 'var(--safe)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {liveSafety?.currentZone?.type === 'DANGER' ? 'gpp_maybe' : liveSafety?.currentZone?.type === 'CAUTION' ? 'warning' : 'gpp_good'}
              </span>
              SAFETY STATUS
            </h3>
          </div>
          <div style={{ padding: '16px' }}>
            {liveSafety?.currentZone ? (
              <>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{liveSafety.currentZone.type === 'DANGER' ? '🔴 HIGH-RISK AREA' : '🟡 CAUTION AREA'}</h4>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                  {liveSafety.currentZone.type === 'DANGER' 
                    ? `You have entered a monitored high-risk zone: ${liveSafety.currentZone.name}. Consider moving toward a nearby safe location.` 
                    : `You have entered a monitored caution zone: ${liveSafety.currentZone.name}. Stay aware of your surroundings.`}
                </p>
                
                {liveSafety.currentZone.type === 'DANGER' && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <EmergencyPoliceButton phoneNumber="112" />
                    <button 
                      onClick={() => navigate('/tourist/sos')}
                      style={{
                        width: '100%',
                        background: 'var(--error)',
                        color: '#fff',
                        padding: '12px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '15px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 20 }}>emergency_share</span>
                      SEND SOS
                    </button>
                  </div>
                )}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: 13 }} onClick={() => navigate('/tourist/map')}>OPEN MAP</button>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: 13 }} onClick={() => navigate('/tourist/nearby')}>NEARBY HELP</button>
                </div>
              </>
            ) : (
              <>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 16 }}>🟢 SAFE AREA</h4>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--on-surface-variant)' }}>
                  You are currently outside all configured caution and danger zones.
                </p>
                {/* Developer testing button to drop a Danger zone on the user */}
                {process.env.NODE_ENV === 'development' && !liveSafety?.testZone && (
                  <button onClick={() => liveSafety?.createTestZone(100)} className="btn btn-secondary" style={{ marginTop: '12px', fontSize: 12, padding: '6px' }}>
                    [DEV] Drop Test Zone Here
                  </button>
                )}
                {liveSafety?.testZone && (
                  <button onClick={() => liveSafety?.clearTestZone()} className="btn btn-secondary" style={{ marginTop: '12px', fontSize: 12, padding: '6px' }}>
                    [DEV] Clear Test Zone
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Safety Check Shortcut */}
      {!isDemoMode && (
        <div className="card" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/tourist/safety-check')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)' }}>fact_check</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 16 }}>Safety Check</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)' }}>Complete questionnaire to update score</p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)' }}>chevron_right</span>
        </div>
      )}

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
          <p className={`dashboard-status-value ${isOnline ? 'safe' : ''}`} style={{ color: isOnline ? 'var(--safe)' : 'var(--caution)' }}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
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
            {t('map')}
          </span>
          <button className="dashboard-map-link" onClick={() => navigate('/tourist/map')}>
            {t('open_map')}
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          </button>
        </div>
        <div className="dashboard-map-body">
          <div className="dashboard-map-route-line" />
          <div className="dashboard-map-dot" />
        </div>
      </div>

      {/* Nearby Quick Access */}
      <div className="dashboard-map-card" style={{ marginTop: '16px', background: 'var(--surface-container-high)' }}>
        <div className="dashboard-map-header" style={{ borderBottom: 'none' }}>
          <span className="dashboard-map-title">
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>explore</span>
            Nearby Services
          </span>
          <button className="dashboard-map-link" onClick={() => navigate('/tourist/nearby')}>
            Find Help
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          </button>
        </div>
      </div>

      {/* Journey Progress (Demo Only) */}
      {isDemoMode && (
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
      )}

      {/* Demo navigation links */}
      {isDemoMode && (
        <div className="dashboard-demo-links">
          <button className="dashboard-demo-link" onClick={() => navigate('/tourist/area-warning')}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--caution)' }}>warning</span>
            Area Warning
          </button>
          <button 
            className="dashboard-demo-link" 
            onClick={() => advanceSimulation()}
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
      )}

      {/* Real Safety & Offline Status Card (Authenticated Live Mode) */}
      {!isDemoMode && (
        <SafetyStatusCard 
          isOnline={isOnline} 
          gpsStatus={gpsStatus} 
          currentLoc={currentLoc} 
          pendingSOSCount={pendingSOSCount} 
          syncOfflineData={syncOfflineData}
          navigate={navigate} 
          userId={profile.auth_user_id}
        />
      )}

      {/* SOS Button */}
      <div className="dashboard-sos-wrap">
        <button className="dashboard-sos-btn" onClick={() => navigate('/tourist/sos')}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22 }}>
            emergency_share
          </span>
          {t('emergency')}
        </button>
      </div>
    </div>
  );
}

function SafetyStatusCard({ isOnline, gpsStatus, currentLoc, pendingSOSCount, syncOfflineData, navigate, userId }) {
  const { t } = useLanguage();
  const [mapsReady, setMapsReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [contactsReady, setContactsReady] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    let active = true;
    const loadCacheStats = async () => {
      const maps = await getDownloadedRegions();
      if (userId) {
        const p = await getOfflineData(userId, 'profile');
        const c = await getOfflineData(userId, 'contacts'); // from emergencyContactService
        if (active) {
          setProfileReady(!!p);
          setContactsReady(!!c);
          setMapsReady(maps.length > 0);
          
          // Basic heuristic for last sync
          if (p?.updated_at) {
            setLastSync(new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      }
    };
    loadCacheStats();
    return () => { active = false; };
  }, [userId]);

  return (
    <div className="card" style={{ marginTop: '16px' }}>
      {!isOnline ? (
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--error-container)', borderRadius: '8px', borderLeft: '4px solid var(--error)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-error-container)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>wifi_off</span>
            OFFLINE MODE
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--on-error-container)', opacity: 0.9 }}>
            Internet connection unavailable. Your safety features remain active.
          </p>
        </div>
      ) : (
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 20 }}>security</span>
          Safety & Offline Status
        </h3>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Network</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isOnline ? 'var(--success)' : 'var(--error)' }}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>GPS</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: gpsStatus === 'ACTIVE' ? 'var(--success)' : 'var(--error)' }}>
            {gpsStatus === 'ACTIVE' ? 'LIVE' : gpsStatus === 'DENIED' ? 'DENIED' : 'UNAVAILABLE'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Location</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {currentLoc.latitude ? `${currentLoc.latitude.toFixed(4)}, ${currentLoc.longitude.toFixed(4)}` : 'Unknown'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Accuracy</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {currentLoc.accuracy ? `±${Math.round(currentLoc.accuracy)}m` : 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Offline Maps</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: mapsReady ? 'var(--success)' : 'var(--caution)' }}>
            {mapsReady ? 'READY' : 'NOT DOWNLOADED'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Pending SOS</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: pendingSOSCount > 0 ? 'var(--error)' : 'var(--on-surface)' }}>
            {pendingSOSCount} Queued
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Safety Data</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: profileReady && contactsReady ? 'var(--success)' : 'var(--caution)' }}>
            {profileReady && contactsReady ? 'CACHED' : 'NOT CACHED'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Last Sync</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {lastSync || 'Never'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/tourist/offline')} style={{ padding: '10px' }}>
          {t('offline_status')}
        </button>
        
        {!isOnline && mapsReady && (
          <button className="btn btn-primary btn-full" onClick={() => navigate('/tourist/offline')} style={{ padding: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: '4px' }}>map</span>
            {t('view_offline_maps')}
          </button>
        )}
      </div>
      
      {pendingSOSCount > 0 && isOnline && (
        <button className="btn btn-primary btn-full" onClick={syncOfflineData} style={{ padding: '10px', marginTop: '8px' }}>
          Sync Pending SOS Now
        </button>
      )}
    </div>
  );
}
