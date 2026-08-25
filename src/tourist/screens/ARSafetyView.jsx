import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useDemoSimulation } from '../../utils/useDemoSimulation';
import { useLiveLocation } from '../../utils/LocationContext';
import { DEMO_MAP_DATA } from '../../utils/mockMapData';
import { calculateDistance, calculateBearing } from '../../utils/geoUtils';
import './ARSafetyView.css';

function normalizeAngle(angle) {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

function smoothHeading(current, target, smoothingFactor = 0.2) {
  if (current === null) return normalizeAngle(target);
  let diff = target - current;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeAngle(current + diff * smoothingFactor);
}

export default function ARSafetyView() {
  const navigate = useNavigate();
  // FIXED: needsHelp -> needHelp
  const { incident, activateSOS, markSafe, needHelp } = useSharedDemoState();
  const { advanceSimulation, isComplete } = useDemoSimulation();
  
  // Use centralized live location
  const { currentLoc: contextLoc, gpsStatus, tracking, requestPermissionAndStart } = useLiveLocation();
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunks = useRef([]);

  const [httpsWarning, setHttpsWarning] = useState(false);
  
  // UX States
  const [activeDestination, setActiveDestination] = useState(null);
  const [showDestMenu, setShowDestMenu] = useState(false);
  const [statusExpanded, setStatusExpanded] = useState(false);
  
  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  
  useEffect(() => {
    import('../../services/emergencyContactService').then(module => {
      module.getEmergencyContacts().then(({ data }) => setEmergencyContacts(data || []));
    });
  }, []);
  
  // MediaRecorder States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  // AR State
  const [demoMode, setDemoMode] = useState(
    !window.isSecureContext || 
    !('geolocation' in navigator) || 
    typeof navigator.mediaDevices === 'undefined'
  );
  
  const [cameraStatus, setCameraStatus] = useState('WAITING');
  
  // Compass Permission States
  const [orientationStatus, setOrientationStatus] = useState(() => {
    if (!window.isSecureContext || !('geolocation' in navigator) || typeof navigator.mediaDevices === 'undefined') return 'WAITING';
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') return 'PERMISSION REQUIRED';
    if (window.DeviceOrientationEvent) return 'WAITING';
    return 'UNAVAILABLE';
  });
  
  const [orientationPermission, setOrientationPermission] = useState(() => {
    if (!window.isSecureContext || !('geolocation' in navigator) || typeof navigator.mediaDevices === 'undefined') return 'WAITING';
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') return 'REQUIRES_PROMPT';
    if (window.DeviceOrientationEvent) return 'GRANTED';
    return 'UNAVAILABLE';
  });
  
  const [realHeading, setRealHeading] = useState(null);
  
  // Demo Movement States
  const [simulatedHeading, setSimulatedHeading] = useState(0);
  const [simulatedLoc, setSimulatedLoc] = useState(DEMO_MAP_DATA.touristCurrent);
  
  // Ensure we use the centralized location if tracking, else fall back to the existing demo loc logic
  // The LocationContext handles the fallback internally, so we can just use contextLoc if it's available.
  const currentLoc = contextLoc && contextLoc.latitude ? [contextLoc.latitude, contextLoc.longitude] : simulatedLoc;
  const heading = demoMode ? simulatedHeading : (realHeading || 0);

  // Handle Camera
  useEffect(() => {
    let stream = null;
    let isMounted = true;
    
    async function startCamera() {
      if (demoMode) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: true // Request audio for evidence recording
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraStatus('ACTIVE');
        }
      } catch {
        // Fallback to video only if audio denied
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (isMounted && videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraStatus('ACTIVE (NO AUDIO)');
          }
        } catch (videoErr) {
          console.warn("Camera access failed, falling back to Demo Mode:", videoErr);
          if (isMounted) {
            setCameraStatus('DENIED/UNAVAILABLE');
            setDemoMode(true);
          }
        }
      }
    }
    
    startCamera();
    
    return () => {
      isMounted = false;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [demoMode]);

  // Auto-start GPS separately so it doesn't interrupt camera recording
  useEffect(() => {
    if (!demoMode && !tracking && gpsStatus !== 'DENIED' && gpsStatus !== 'UNAVAILABLE') {
       requestPermissionAndStart();
    }
  }, [demoMode, tracking, gpsStatus, requestPermissionAndStart]);

  // Handle Compass Loop (Only runs if permission is granted)
  useEffect(() => {
    if (demoMode || orientationPermission !== 'GRANTED') return;
    
    let animationFrameId;
    let targetHeading = null;
    let currentSmoothedHeading = null;

    const updateHeadingLoop = () => {
      if (targetHeading !== null) {
        currentSmoothedHeading = smoothHeading(currentSmoothedHeading, targetHeading, 0.15);
        setRealHeading(Math.round(currentSmoothedHeading));
      }
      animationFrameId = requestAnimationFrame(updateHeadingLoop);
    };

    const handleOrientation = (e) => {
      let compassHeading = null;
      if (e.webkitCompassHeading !== undefined) {
        compassHeading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        compassHeading = Math.abs(e.alpha - 360);
      }
      
      if (compassHeading !== null) {
        let screenOrientation = window.orientation || (window.screen && window.screen.orientation ? window.screen.orientation.angle : 0);
        if (screenOrientation) {
          compassHeading += screenOrientation;
        }
        targetHeading = normalizeAngle(compassHeading);
        setOrientationStatus('ACTIVE');
      }
    };
    
    animationFrameId = requestAnimationFrame(updateHeadingLoop);
    window.addEventListener('deviceorientation', handleOrientation);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [demoMode, orientationPermission]);

  const requestCompassPermission = () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            setOrientationPermission('GRANTED');
            setOrientationStatus('WAITING FOR DATA');
          } else {
            setOrientationPermission('DENIED');
            setOrientationStatus('DENIED');
          }
        })
        .catch(console.error);
    }
  };

  // Recording Logic
  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    recordedChunks.current = [];
    const stream = videoRef.current.srcObject;
    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
        setRecordedBlob(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e) {
      console.error("MediaRecorder error:", e);
      // Fallback mime type
      try {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/mp4' });
          setRecordedBlob(blob);
        };
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
      } catch (err2) {
        console.error("MediaRecorder fallback error:", err2);
        alert("Recording not supported on this device.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleShare = async () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `TouristGuardian_Evidence_${Date.now()}.webm`, { type: recordedBlob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Tourist Guardian — Emergency Evidence',
          text: 'Emergency video evidence from Tourist Guardian',
          files: [file]
        });
      } catch (e) {
        console.warn('Share failed:', e);
      }
    } else {
      alert("Sharing files is not supported on this browser. Please use Save Video.");
    }
  };

  const handleSave = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `TouristGuardian_Evidence_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleTrySensors = () => {
    if (!window.isSecureContext) {
      setHttpsWarning(true);
    } else {
      setHttpsWarning(false);
      setDemoMode(false);
      setCameraStatus('WAITING');
      setGpsStatus('WAITING');
      setOrientationStatus('WAITING');
      setOrientationPermission('WAITING');
    }
  };

  // Demo Movement Controls
  const handleMoveSim = (dLat, dLon) => {
    if (demoMode && simulatedLoc) {
      setSimulatedLoc([simulatedLoc[0] + dLat, simulatedLoc[1] + dLon]);
    }
  };

  const getCompassDirString = (deg) => {
    if (deg == null) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8];
  };

  const destinationOptions = [
    { id: 'dest-1', name: DEMO_MAP_DATA.checkpoints[1].name, pos: DEMO_MAP_DATA.checkpoints[1].pos, icon: 'location_on' },
    ...DEMO_MAP_DATA.helpPoints.map(hp => ({ id: hp.id, name: hp.name, pos: hp.pos, icon: 'local_police' }))
  ];

  let navDist = 0;
  let navDistStr = '';
  let targetBearing = 0;
  let relativeBearing = 0;
  let leftPercent = 50;
  let turnInstruction = '';
  let instructionClass = '';
  let markerProximity = 'medium';
  let isVisible = false;
  let reached = false;

  if (activeDestination && currentLoc) {
    navDist = calculateDistance(currentLoc[0], currentLoc[1], activeDestination.pos[0], activeDestination.pos[1]);
    navDistStr = navDist > 1000 ? `${(navDist/1000).toFixed(1)} km` : `${Math.round(navDist)} m`;
    targetBearing = calculateBearing(currentLoc[0], currentLoc[1], activeDestination.pos[0], activeDestination.pos[1]);
    
    relativeBearing = targetBearing - heading;
    if (relativeBearing > 180) relativeBearing -= 360;
    if (relativeBearing < -180) relativeBearing += 360;

    leftPercent = 50 + (relativeBearing / 90) * 50;
    isVisible = Math.abs(relativeBearing) < 90;
    
    if (navDist < 30) {
      reached = true;
      turnInstruction = '✓ DESTINATION REACHED';
      instructionClass = 'ahead';
    } else if (Math.abs(relativeBearing) <= 15) {
      turnInstruction = '↑ AHEAD';
      instructionClass = 'ahead';
    } else if (relativeBearing > 15 && relativeBearing <= 75) {
      turnInstruction = '↗ TURN RIGHT';
    } else if (relativeBearing < -15 && relativeBearing >= -75) {
      turnInstruction = '↖ TURN LEFT';
    } else if (relativeBearing > 75 && relativeBearing <= 135) {
      turnInstruction = '→ STRONGLY RIGHT';
    } else if (relativeBearing < -75 && relativeBearing >= -135) {
      turnInstruction = '← STRONGLY LEFT';
    } else {
      turnInstruction = '↻ TURN AROUND';
    }

    if (navDist < 500) markerProximity = 'near';
    else if (navDist > 3000) markerProximity = 'far';
  }

  const handleSOS = () => activateSOS();
  const handleSafe = () => { markSafe(); navigate('/tourist/dashboard'); };
  const handleHelp = () => { needHelp(); navigate('/tourist/dashboard'); };

  const isDistress = incident.severity === 'CRITICAL';
  const isHighRisk = incident.severity === 'HIGH' || incident.severity === 'CRITICAL';
  const isCaution = incident.severity === 'CAUTION';
  
  const cardClass = `ar-safety-card ${incident.severity.toLowerCase()}`;
  const statusLabel = isDistress ? 'POSSIBLE DISTRESS' : incident.severity;
  const currentCompassDir = getCompassDirString(heading);

  return (
    <div className="ar-screen">
      {/* Background Layers */}
      {demoMode ? (
        <div className="ar-demo-bg">
          <div className="ar-demo-grid" />
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="ar-video-bg" />
      )}

      {/* AR Overlay */}
      <div className="ar-overlay">
        
        {/* Navigation Instruction HUD */}
        {activeDestination && !recordedBlob && !isDistress && (
           <div className={`ar-nav-instruction ${instructionClass}`}>
             {turnInstruction}
           </div>
        )}
        
        {!activeDestination && !recordedBlob && !isDistress && (
          <div className="ar-route-indicator safe" style={{marginTop: 40}}>
             <span className="material-symbols-outlined" style={{fontSize:16}}>navigation</span>
             SELECT DESTINATION
          </div>
        )}

        {/* Top Status Bar */}
        <div className="ar-top-bar">
          <button className="ar-back-btn" onClick={() => navigate('/tourist/menu')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          <div className="ar-status-panel" onClick={() => setStatusExpanded(!statusExpanded)}>
            <div className="ar-status-item">
              <div className={`ar-status-dot ${cameraStatus.includes('ACTIVE') ? 'active' : 'inactive'}`}></div>
              CAM: {demoMode ? 'DEMO' : cameraStatus}
            </div>
            <div className="ar-status-item">
              <div className={`ar-status-dot ${gpsStatus === 'ACTIVE' ? 'active' : 'inactive'}`}></div>
              GPS: {demoMode ? 'DEMO' : gpsStatus}
            </div>
            <div className="ar-status-item">
              <div className={`ar-status-dot ${orientationStatus === 'ACTIVE' ? 'active' : (orientationStatus.includes('WAITING') ? 'demo' : 'inactive')}`}></div>
              CMP: {demoMode ? 'DEMO' : orientationStatus}
            </div>
            
            {statusExpanded && (
              <div className="ar-status-expanded">
                <div style={{fontWeight: 800, marginBottom: 4}}>SENSOR DETAILS</div>
                <div>Heading: {Math.round(heading)}° {currentCompassDir}</div>
                {currentLoc && <div>Loc: {currentLoc[0].toFixed(5)}, {currentLoc[1].toFixed(5)}</div>}
                {demoMode && <div style={{color: '#60a5fa'}}>MEGHALAYA DEMO DATA</div>}
                {!demoMode && <div>Live Location Active</div>}
                
                {orientationPermission === 'REQUIRES_PROMPT' && (
                  <button onClick={requestCompassPermission} style={{marginTop: 8, padding: 4, background: 'white', color: 'black', border: 'none', borderRadius: 4, fontWeight: 'bold'}}>
                    GRANT COMPASS
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* 3D AR Viewport */}
        <div className="ar-viewport">
          {activeDestination && isVisible && !reached && !recordedBlob && !isDistress && (
            <div 
              className={`ar-marker safe ${markerProximity}`} 
              style={{ left: `${leftPercent}%` }}
            >
              <span className="material-symbols-outlined ar-marker-icon">{activeDestination.icon}</span>
              <span className="ar-marker-title">{activeDestination.name.toUpperCase()}</span>
              <span className="ar-marker-dist">{navDistStr}</span>
            </div>
          )}

          {activeDestination && !isVisible && !reached && !recordedBlob && !isDistress && (
            <div className={`ar-edge-indicator ${relativeBearing > 0 ? 'right' : 'left'}`}>
              <span className="material-symbols-outlined" style={{fontSize: 24}}>
                {relativeBearing > 0 ? 'arrow_forward' : 'arrow_back'}
              </span>
              <span>{Math.round(Math.abs(relativeBearing))}°</span>
            </div>
          )}
        </div>
        
        {/* Evidence & Emergency Overlays */}
        <div className="ar-hud-bottom">
          
          {recordedBlob ? (
            <div className="ar-safety-card critical" style={{background: 'var(--surface)', color: 'var(--on-surface)'}}>
               <h3 style={{marginTop:0, marginBottom: 8, fontWeight: 800}}>VIDEO EVIDENCE</h3>
               <div style={{fontSize: 13, color: 'var(--secondary)', marginBottom: 16}}>
                 Recorded at: {new Date().toLocaleTimeString()}<br/>
                 {currentLoc && <>Location: {currentLoc[0].toFixed(5)}, {currentLoc[1].toFixed(5)}<br/></>}
                 Safety Score: {incident.score}<br/>
                 Risk State: {incident.severity}
               </div>
               <div className="ar-action-row">
                  <button className="ar-btn ar-btn-safe" onClick={() => {
                    const video = document.createElement('video');
                    video.src = URL.createObjectURL(recordedBlob);
                    video.controls = true;
                    video.style.width = '100%';
                    video.style.position = 'fixed';
                    video.style.top = '0'; video.style.left = '0'; video.style.zIndex = '9999';
                    document.body.appendChild(video);
                    video.play();
                    video.onended = () => { video.remove(); };
                  }}>▶ PLAY</button>
                  <button className="ar-btn ar-btn-safe" onClick={handleSave}>SAVE VIDEO</button>
               </div>
               <div className="ar-action-row" style={{marginTop: 8}}>
                  <button className="ar-btn ar-btn-help" onClick={handleShare}>SHARE EVIDENCE</button>
                  <button className="ar-btn ar-btn-safe" onClick={() => setRecordedBlob(null)}>DISCARD</button>
               </div>
               <p style={{fontSize: 11, textAlign: 'center', color: 'var(--secondary)', marginTop: 8}}>
                 Backend dispatch will be connected in Stage 7.
               </p>
            </div>
          ) : isDistress ? (
            <div className="ar-safety-card critical">
               <h2 style={{margin: 0, fontWeight: 800}}>SOS ACTIVATED</h2>
               <p style={{fontSize: 13, margin: '4px 0 16px', opacity: 0.9}}>
                 Location Shared • Authority Notified<br/>
                 <span style={{fontSize: 11, opacity: 0.7}}>PROTOTYPE — No actual dispatch</span>
               </p>
               
               <div style={{background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: 16}}>
                 <h4 style={{margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase'}}>Emergency Contacts</h4>
                 {emergencyContacts.map(c => (
                   <div key={c.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 14}}>
                     <div>
                       <strong>{c.name}</strong>
                       <div style={{fontSize: 12, opacity: 0.8}}>{c.phone}</div>
                     </div>
                     <a href={`tel:${c.phone}`} style={{background: 'white', color: 'var(--error)', padding: '6px 12px', borderRadius: 4, textDecoration: 'none', fontWeight: 700}}>CALL</a>
                   </div>
                 ))}
               </div>

               <div className="ar-action-row">
                 <button className="ar-btn ar-btn-safe" onClick={handleSafe}>I'M SAFE</button>
                 {!demoMode && !isRecording && (
                    <button className="ar-btn ar-btn-help" onClick={startRecording}>● RECORD</button>
                 )}
                 {isRecording && (
                    <button className="ar-btn ar-btn-sos" onClick={stopRecording}>
                      <span style={{animation: 'pulse 1s infinite'}}>🔴 {formatTime(recordingTime)}</span> STOP
                    </button>
                 )}
               </div>
            </div>
          ) : (
            <>
              {/* Normal HUD */}
              {!isRecording && activeDestination && (
                <div className="ar-primary-dest-card">
                  <div className="ar-primary-dest-header">
                    <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>{activeDestination.icon}</span>
                    {activeDestination.name.toUpperCase()}
                  </div>
                  <div className="ar-primary-dest-stats">
                    <span className="ar-primary-dest-dist">{navDistStr}</span>
                    <span>Dir: {Math.round(targetBearing)}° {getCompassDirString(targetBearing)}</span>
                  </div>
                </div>
              )}

              <div className="ar-mini-compass">
                 <div className="ar-compass-dial">
                   <span>W</span>
                   <span className="ar-compass-heading">
                     {Math.round(heading)}° <span className="ar-compass-active-dir">{currentCompassDir}</span>
                   </span>
                   <span>E</span>
                 </div>
              </div>

              {demoMode && (
                <div className="ar-demo-controls" style={{flexDirection: 'column', gap: 8}}>
                  <div className="ar-heading-slider-wrap" style={{marginTop: 0}}>
                    <span>Heading</span>
                    <input type="range" min="0" max="359" value={simulatedHeading} onChange={(e) => setSimulatedHeading(parseInt(e.target.value))} className="ar-heading-slider" />
                    <span>{simulatedHeading}°</span>
                  </div>
                  <div style={{display: 'flex', gap: 8, justifyContent: 'center'}}>
                    <button className="ar-demo-btn" onClick={() => handleMoveSim(0.0001, 0)}>Move North</button>
                    <button className="ar-demo-btn" onClick={() => handleMoveSim(-0.0001, 0)}>Move South</button>
                    <button className="ar-demo-btn" onClick={advanceSimulation} disabled={isComplete}>{isComplete ? 'Max Demo State' : 'Advance Risk'}</button>
                    <button className="ar-demo-btn" onClick={handleTrySensors}>Try Sensors</button>
                  </div>
                </div>
              )}

              {httpsWarning && (
                <div style={{ background: 'var(--error)', color: 'white', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
                  Real camera access requires HTTPS on supported mobile browsers. Using Demo Mode.
                </div>
              )}
              
              <div className={cardClass}>
                <div className="ar-score-row">
                  <div className="ar-score-main">
                    <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                      {isDistress ? 'emergency' : (isCaution || isHighRisk ? 'warning' : 'shield')}
                    </span>
                    <div>
                      <div className="ar-score-value">{incident.score} / 100</div>
                      <div className="ar-score-label">{statusLabel}</div>
                    </div>
                  </div>
                  
                  {!demoMode && !isRecording && (
                     <button className="ar-btn ar-btn-safe" style={{flex: '0 0 auto', padding: '8px 12px'}} onClick={startRecording}>
                       ● RECORD
                     </button>
                  )}
                  {isRecording && (
                     <button className="ar-btn ar-btn-sos" style={{flex: '0 0 auto', padding: '8px 12px', animation: 'pulse 1s infinite'}} onClick={stopRecording}>
                       🔴 {formatTime(recordingTime)} STOP
                     </button>
                  )}
                </div>
                
                <div className="ar-action-row" style={{marginTop: 16}}>
                  {isCaution || isHighRisk ? (
                    <>
                      <button className="ar-btn ar-btn-safe" onClick={() => setShowDestMenu(true)}>DEST</button>
                      <button className="ar-btn ar-btn-safe" onClick={handleSafe}>I'M SAFE</button>
                      <button className="ar-btn ar-btn-sos" onClick={handleSOS}>ACTIVATE SOS</button>
                    </>
                  ) : (
                    <>
                      <button className="ar-btn ar-btn-safe" onClick={() => navigate('/tourist/map')}>MAP</button>
                      <button className="ar-btn ar-btn-safe" onClick={() => setShowDestMenu(true)}>DEST</button>
                      <button className="ar-btn ar-btn-help" onClick={handleHelp} style={{background: 'var(--caution)', color: 'black'}}>HELP</button>
                      <button className="ar-btn ar-btn-sos" onClick={handleSOS}>ACTIVATE SOS</button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showDestMenu && (
        <div className="ar-dest-menu-backdrop" onClick={() => setShowDestMenu(false)}>
          <div className="ar-dest-menu" onClick={e => e.stopPropagation()}>
            <div className="ar-dest-menu-title">Select Destination</div>
            {destinationOptions.map(dest => (
              <button 
                key={dest.id}
                className="ar-dest-menu-btn"
                onClick={() => {
                  setActiveDestination(dest);
                  setShowDestMenu(false);
                }}
              >
                <span className="material-symbols-outlined" style={{color: 'var(--primary)'}}>{dest.icon}</span>
                {dest.name}
              </button>
            ))}
            <button className="ar-btn ar-btn-safe" style={{marginTop: 8}} onClick={() => setShowDestMenu(false)}>CANCEL</button>
          </div>
        </div>
      )}

    </div>
  );
}
