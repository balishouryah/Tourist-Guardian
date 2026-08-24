import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';

export default function IncidentToast() {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();
  const { latestIncident } = useAuthorityRealtime();
  const notifiedIncidentIds = useRef(new Set());

  useEffect(() => {
    if (!latestIncident) return;
    
    if (notifiedIncidentIds.current.has(latestIncident.id)) return;
    
    // Only notify if it's a new or currently active incident.
    // We shouldn't notify for resolved incidents that happen to be the latest fetched.
    if (!['ACTIVE', 'QUEUED'].includes(latestIncident.status)) return;

    notifiedIncidentIds.current.add(latestIncident.id);

    const newToast = {
      id: latestIncident.id,
      touristId: latestIncident.tourist_id,
      touristName: latestIncident.tourists?.name || 'Unknown Tourist',
      severity: latestIncident.severity,
      time: new Date(latestIncident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: latestIncident.latitude && latestIncident.longitude ? `${latestIncident.latitude.toFixed(4)}, ${latestIncident.longitude.toFixed(4)}` : 'Unknown'
    };
    // oxlint-disable-next-line react/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 15s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 15000);
  }, [latestIncident]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {toasts.map(toast => (
        <div key={toast.id} onClick={() => navigate(`/authority/tourist/${toast.touristId}`)} style={{
          background: 'var(--surface-container-lowest)',
          borderLeft: `4px solid ${toast.severity === 'CRITICAL' ? 'var(--error)' : 'var(--caution)'}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          borderRadius: '8px',
          padding: '16px',
          width: '320px',
          cursor: 'pointer',
          animation: 'slide-up 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--on-surface)' }}>
              🚨 SOS Alert — {toast.touristName} needs assistance
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>location_on</span>
              {toast.location}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{toast.time}</span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
