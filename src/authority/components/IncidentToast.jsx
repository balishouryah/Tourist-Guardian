import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { authoritySupabase } from '../../lib/supabase';

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
      time: 'Just now', // Can be formatted better, but for realtime 'Just now' makes sense
      location: latestIncident.latitude && latestIncident.longitude ? `${latestIncident.latitude.toFixed(5)}, ${latestIncident.longitude.toFixed(5)}` : 'Unknown'
    };
    // oxlint-disable-next-line react/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setToasts(prev => [...prev, newToast]);

    // Auto-remove after 30s for SOS (increased for high-priority)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 30000);
  }, [latestIncident]);

  useEffect(() => {
    if (!authoritySupabase) return;
    
    const channel = authoritySupabase.channel('efir_toast')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'e_firs' }, (payload) => {
        const newEfir = payload.new;
        if (newEfir.status !== 'ACTIVE') return;

        const newToast = {
          id: newEfir.id,
          type: 'EFIR',
          touristId: newEfir.tourist_id,
          touristName: newEfir.tourist_name_snapshot || 'Unknown Tourist',
          firReference: newEfir.fir_reference,
          time: new Date(newEfir.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setToasts(prev => [...prev, newToast]);
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== newToast.id));
        }, 15000);
      })
      .subscribe();

    return () => {
      authoritySupabase.removeChannel(channel);
    };
  }, []);

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
      {toasts.map(toast => {
        if (toast.type === 'EFIR') {
          return (
            <div key={toast.id} onClick={() => navigate(`/authority/efir/${toast.id}`)} style={{
              background: 'var(--surface-container-lowest)',
              borderLeft: `4px solid var(--error)`,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              borderRadius: '8px',
              padding: '16px',
              width: '320px',
              cursor: 'pointer',
              animation: 'slide-up 0.3s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--on-surface)' }}>
                  🚨 E-FIR GENERATED
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--on-surface)' }}>
                {toast.firReference}<br/>
                {toast.touristName} — Missing Tourist
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{toast.time}</span>
              </div>
            </div>
          );
        }

        return (
          <div key={toast.id} style={{
            background: 'var(--surface-container-lowest)',
            border: '2px solid var(--error)',
            boxShadow: '0 12px 32px rgba(220, 38, 38, 0.25)',
            borderRadius: '12px',
            padding: '20px',
            width: '360px',
            animation: 'slide-up 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--error)' }}>
                🚨 NEW SOS ALERT
              </span>
            </div>
            
            <div style={{ fontSize: '15px', color: 'var(--on-surface)', marginBottom: '16px', fontWeight: 500 }}>
              {toast.touristName} has triggered an SOS.
            </div>

            <div style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>Location:</span> {toast.location}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: '20px' }}>
              <span style={{ fontWeight: 600 }}>Time:</span> {toast.time}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => {
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                  navigate(`/authority/tourist/${toast.touristId}`);
                }}
                style={{
                  background: 'var(--error)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.05em'
                }}
              >
                VIEW INCIDENT
              </button>
              
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                style={{
                  background: 'transparent',
                  color: 'var(--on-surface-variant)',
                  border: '1px solid var(--outline)',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
