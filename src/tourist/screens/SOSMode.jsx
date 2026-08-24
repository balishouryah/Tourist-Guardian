import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useLiveLocation } from '../../utils/LocationContext';
import { getEmergencyContacts } from '../../services/emergencyContactService';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../utils/AuthContext';
import { useLiveIncident } from '../../utils/useLiveIncident';
import { useOfflineStatus } from '../../utils/useOfflineStatus';
import { updateIncidentStatus, createIncident } from '../../services/incidentService';
import { useLanguage } from '../../utils/LanguageContext';
import EmergencyPoliceButton from '../../components/EmergencyPoliceButton';
import './SOSMode.css';

export default function SOSMode() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { incident: demoIncident, activateSOS: activateDemoSOS, markSafe: demoMarkSafe } = useSharedDemoState();
  const { liveIncident, setLiveIncident, isLoading: incidentLoading } = useLiveIncident();
  const { isOnline } = useOfflineStatus();
  const { user, isDemoMode } = useAuth();
  
  const { currentLoc } = useLiveLocation();
  const [contacts, setContacts] = useState([]);
  const [offlineQueued, setOfflineQueued] = useState(false);
  const [sosError, setSosError] = useState(null);
  
  const isTriggeringRef = useRef(false);

  useEffect(() => {
    getEmergencyContacts().then(({ data }) => setContacts(data || []));
  }, []);

  // Immediately notify Authority of the critical SOS event when this screen mounts
  useEffect(() => {
    const triggerSOS = async () => {
      if (incidentLoading) return; // Wait until initial incident fetch is complete
      if (isTriggeringRef.current) return;
      isTriggeringRef.current = true;

      let lat = currentLoc?.latitude ?? window.tgLastLat ?? 25.5788;
      let lng = currentLoc?.longitude ?? window.tgLastLng ?? 91.8933;

      if (isDemoMode || !user) {
        if (demoIncident.status !== 'SOS ACTIVATED') {
          activateDemoSOS(lat, lng);
        }
      } else {
        if (!liveIncident) {
          try {
            const { data, error, isQueued } = await createIncident({
              incidentType: 'SOS',
              severity: 'CRITICAL',
              riskScore: 100,
              signals: ['User Triggered SOS'],
              latitude: lat,
              longitude: lng,
            });
            
            if (error) {
              setSosError('Failed to send SOS: ' + error.message);
              isTriggeringRef.current = false;
            } else if (isQueued) {
              setOfflineQueued(true);
              setLiveIncident({ status: 'QUEUED', severity: 'CRITICAL' });
            } else if (data) {
              setOfflineQueued(false);
              setLiveIncident(data);
            }
          } catch (err) {
            setSosError('An unexpected error occurred while sending SOS.');
            isTriggeringRef.current = false;
          }
        }
      }
    };

    triggerSOS();
  }, [incidentLoading, isDemoMode, user, currentLoc, activateDemoSOS, liveIncident]);

  const currentStatus = isDemoMode || !user ? demoIncident?.status : liveIncident?.status;

  const handleCancel = async () => {
    if (isDemoMode || !user) {
      demoMarkSafe();
    } else {
      if (liveIncident?.id) {
        await updateIncidentStatus(liveIncident.id, 'CANCELLED');
        setLiveIncident(null);
      }
    }
    navigate('/tourist/dashboard');
  };

  return (
    <div className="sos-mode-screen animate-fade-in" style={{ paddingBottom: '100px' }}>
      <div className="sos-header">
        <h1 className="sos-title">{t('sos_title')}</h1>
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

      <div className="sos-status-card" style={{ padding: '24px' }}>
        
        {offlineQueued || liveIncident?.status === 'QUEUED' ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--error)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">cloud_off</span>
              OFFLINE EMERGENCY
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', margin: 0 }}>
              Your SOS is queued and will be sent automatically when connectivity returns.
            </p>
          </div>
        ) : currentStatus === 'RESOLVED' ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--safe)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">check_circle</span>
              {t('emergency_resolved')}
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', margin: 0 }}>
              {t('incident_resolved')}
            </p>
          </div>
        ) : currentStatus === 'RESPONDING' || currentStatus === 'ESCALATED' ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#16a34a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">shield_person</span>
              {t('help_on_way')}
            </h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', margin: '0 0 16px 0' }}>
              {t('authorities_responding')}
            </p>
            <p style={{ color: 'var(--on-surface)', fontSize: '15px', margin: 0, fontWeight: 600 }}>
              {t('location_available')}
            </p>
          </div>
        ) : currentStatus === 'ACKNOWLEDGED' || ((isDemoMode || !user) && demoIncident?.timeline?.some(t => t.event.includes('acknowledged'))) ? (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#16a34a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">check_circle</span>
              {t('report_ack')}
            </h2>
            <p style={{ color: 'var(--on-surface)', fontSize: '15px', margin: '0 0 8px 0', fontWeight: 600 }}>
              {t('report_seen')}
            </p>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', margin: 0 }}>
              {t('stay_calm')}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--error)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">emergency_share</span>
              {t('emergency_active')}
            </h2>
            {sosError ? (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ color: 'var(--error)', fontSize: '14px', margin: 0, fontWeight: 600 }}>{sosError}</p>
                <button className="btn btn-secondary" style={{ marginTop: '8px', fontSize: '12px', padding: '6px 12px' }} onClick={() => { setSosError(null); isTriggeringRef.current = false; }}>RETRY</button>
              </div>
            ) : (
              <>
                <p style={{ color: 'var(--on-surface)', fontSize: '15px', margin: '0 0 8px 0', fontWeight: 600 }}>
                  {t('sos_sent')}
                </p>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '15px', margin: '0 0 16px 0' }}>
                  {t('location_shared')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 500 }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  {t('waiting_ack')}
                </div>
              </>
            )}
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}

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
                {t('call')}
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="sos-actions" style={{ position: 'static', marginTop: '32px', width: '100%', padding: '0 24px', boxSizing: 'border-box' }}>
        <EmergencyPoliceButton phoneNumber="112" />
        
        <button 
          onClick={() => navigate('/tourist/nearby?category=police')}
          style={{
            width: '100%',
            marginTop: '12px',
            background: 'var(--surface)',
            border: '1px solid var(--primary)',
            color: 'var(--primary)',
            padding: '16px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <span className="material-symbols-outlined">pin_drop</span>
          {t('nearest_police')}
        </button>

        {currentStatus === 'RESOLVED' ? (
          <button className="btn btn-primary" onClick={() => navigate('/tourist/dashboard')} style={{ marginTop: '24px', width: '100%' }}>
            {t('return_dashboard')}
          </button>
        ) : (
          <button className="btn-sos-cancel" onClick={handleCancel} style={{ marginTop: '24px' }}>
            {t('false_alarm')}
          </button>
        )}
      </div>
    </div>
  );
}
