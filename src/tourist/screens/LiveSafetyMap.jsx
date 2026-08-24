import { useNavigate } from 'react-router-dom';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useLiveLocation } from '../../utils/LocationContext';
import InteractiveMap from '../../components/InteractiveMap';
import './LiveSafetyMap.css';

export default function LiveSafetyMap() {
  const navigate = useNavigate();
  const { incident } = useSharedDemoState();
  const { currentLoc } = useLiveLocation();

  return (
    <div className="tourist-map-screen">
      <div className="tourist-map-header-bar">
        <button className="tourist-map-back" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <span className="tourist-map-title">Live Route Tracking</span>
      </div>
      
      <div className="tourist-map-content">
        <InteractiveMap showAuthorityView={false} incidentState={incident} currentLoc={currentLoc} />
      </div>

      <div className="tourist-map-overlay-bottom">
        <div className="tourist-map-status-pill">
          {incident.severity === 'CRITICAL' ? (
            <><span className="material-symbols-outlined" style={{color: 'var(--error)'}}>warning</span> Route Deviation Detected</>
          ) : (
            <><span className="material-symbols-outlined" style={{color: 'var(--safe)'}}>shield</span> You are on a safe path</>
          )}
        </div>
      </div>
    </div>
  );
}
