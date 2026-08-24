import { Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import IncidentLocationTracker from '../components/IncidentLocationTracker';
import { useOfflineStatus } from '../utils/useOfflineStatus';
import './TouristLayout.css';

export default function TouristLayout() {
  const { isOnline, isSyncing, pendingSOSCount } = useOfflineStatus();

  return (
    <div className="tourist-layout">
      {/* Global Offline/Sync Banner */}
      {!isOnline && pendingSOSCount === 0 && (
        <div style={{ backgroundColor: 'var(--caution)', color: '#000', textAlign: 'center', fontSize: 12, padding: '4px', fontWeight: 'bold' }}>
          OFFLINE MODE
        </div>
      )}
      {pendingSOSCount > 0 && (
        <div style={{ backgroundColor: 'var(--error)', color: 'white', textAlign: 'center', fontSize: 12, padding: '4px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cloud_off</span>
          {pendingSOSCount} SOS QUEUED
        </div>
      )}
      {isSyncing && (
        <div style={{ backgroundColor: 'var(--primary)', color: 'white', textAlign: 'center', fontSize: 12, padding: '4px', fontWeight: 'bold' }}>
          SYNCHRONIZING...
        </div>
      )}

      <IncidentLocationTracker />
      <div className="tourist-layout-content">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  );
}
