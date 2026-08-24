import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useLiveLocation } from '../../utils/LocationContext';
import { getEmergencyContacts } from '../../services/emergencyContactService';
import { supabase } from '../../lib/supabase';
import './SOSMode.css';

export default function SOSMode() {
  const navigate = useNavigate();
  const { incident, activateSOS, markSafe } = useSharedDemoState();
  const { currentLoc } = useLiveLocation();
  const [contacts, setContacts] = useState([]);
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    getEmergencyContacts().then(({ data }) => setContacts(data || []));
  }, []);

  // Immediately notify Authority of the critical SOS event when this screen mounts
  useEffect(() => {
    // Check if we are already in SOS state to avoid infinite triggers, 
    // but if we aren't, immediately activate it.
    if (incident.status !== 'SOS ACTIVATED') {
      activateSOS(currentLoc?.latitude, currentLoc?.longitude);
    }
  }, [incident.status, activateSOS, currentLoc]);

  // Listen to realtime backend updates for this incident
  useEffect(() => {
    if (!incident.backendIncidentId || !supabase) return;

    let isMounted = true;
    const channel = supabase.channel(`tourist_incident_${incident.backendIncidentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${incident.backendIncidentId}` }, (payload) => {
        if (isMounted) {
          setBackendStatus(payload.new.status);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [incident.backendIncidentId]);

  const handleCancel = () => {
    // If they cancel, mark safe and return to dashboard
    markSafe();
    navigate('/tourist/dashboard');
  };

  return (
    <div className="sos-mode-screen animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="sos-header">
        <h1 className="sos-title">SOS ACTIVATED</h1>
        <p className="sos-subtitle">
          Emergency mode activated for the Tourist Guardian prototype.
        </p>
      </div>

      <div className="sos-pulse-container">
        <div className="sos-pulse-ring" style={{ animationDelay: '0s' }} />
        <div className="sos-pulse-ring" style={{ animationDelay: '0.6s' }} />
        <div className="sos-pulse-ring" style={{ animationDelay: '1.2s' }} />
        <div className="sos-pulse-core">
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 48 }}>
            emergency_share
          </span>
        </div>
      </div>

      <div className="sos-status-card">
        <div className="sos-status-item">
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined sos-status-icon">my_location</span>
            Shared with Authority
          </span>
          <span className="material-symbols-outlined" style={{ color: '#fff' }}>check_circle</span>
        </div>
        <div className="sos-status-item">
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined sos-status-icon">local_police</span>
            {backendStatus === 'ACKNOWLEDGED' ? 'Authority has acknowledged your emergency.' 
             : backendStatus === 'RESPONDING' ? 'Help is responding.' 
             : backendStatus === 'RESOLVED' ? 'Incident resolved.' 
             : incident.timeline.some(t => t.event.includes('acknowledged')) ? 'Authority has acknowledged your emergency.' 
             : 'Notification simulated'}
          </span>
          <span className="material-symbols-outlined" style={{ color: '#fff' }}>
            {backendStatus || incident.timeline.some(t => t.event.includes('acknowledged')) ? 'check_circle' : 'pending'}
          </span>
        </div>
      </div>

      {contacts.length > 0 && (
        <div style={{ padding: '0 24px', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', marginTop: '24px' }}>EMERGENCY CONTACTS</h2>
          {contacts.map(c => (
            <div key={c.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '8px'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>{c.name}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>{c.phone}</div>
              </div>
              <a href={`tel:${c.phone}`} style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>call</span>
                CALL
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="sos-actions" style={{ position: 'static', marginTop: '32px' }}>
        <a href="tel:112" className="btn-sos-call" style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined icon-filled">call</span>
          CALL 112 DIRECTLY
        </a>
        <button className="btn-sos-cancel" onClick={handleCancel}>
          Cancel (False Alarm)
        </button>
      </div>
    </div>
  );
}
