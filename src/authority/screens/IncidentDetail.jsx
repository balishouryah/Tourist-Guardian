import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DEMO_INCIDENTS, DEMO_TOURIST, DEMO_TIMELINE } from '../../utils/constants';
import { useSharedDemoState } from '../../utils/useSharedDemoState';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { authoritySupabase } from '../../lib/supabase';
import InteractiveMap from '../../components/InteractiveMap';
import './IncidentDetail.css';

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incident: sharedIncident, acknowledgeIncident, escalateIncident } = useSharedDemoState();
  const [realIncident, setRealIncident] = useState(null);
  const [realTourist, setRealTourist] = useState(null);
  const [realContacts, setRealContacts] = useState([]);
  const [updating, setUpdating] = useState(false);

  const isDemo = id === 'TG-1042' || (id?.startsWith('TG-') && id !== 'TG-1042');

  useEffect(() => {
    if (isDemo || !authoritySupabase) return;

    let isMounted = true;
    
    const fetchIncidentData = async () => {
      const { data: inc } = await authoritySupabase.from('incidents').select('*').eq('id', id).single();
      if (inc && isMounted) {
        setRealIncident(inc);
        const { data: tourist } = await authoritySupabase.from('tourists').select('*').eq('id', inc.tourist_id).single();
        if (tourist && isMounted) setRealTourist(tourist);

        const { data: contacts } = await authoritySupabase.from('emergency_contacts').select('*').eq('tourist_id', inc.tourist_id);
        if (contacts && isMounted) setRealContacts(contacts);
      }
    };

    fetchIncidentData();

    const channel = authoritySupabase.channel(`incident_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents', filter: `id=eq.${id}` }, (payload) => {
        if (isMounted) {
          setRealIncident(payload.new);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      authoritySupabase.removeChannel(channel);
    };
  }, [id, isDemo]);

  const updateIncidentStatus = async (newStatus) => {
    if (isDemo) return;
    setUpdating(true);
    const { error } = await authoritySupabase.from('incidents').update({ status: newStatus }).eq('id', id);
    if (!error && realIncident) {
      setRealIncident({ ...realIncident, status: newStatus });
    }
    setUpdating(false);
  };

  // Construct UI data cleanly depending on source
  let incident = null;
  let tourist = null;
  let timeline = [];
  let contacts = [];

  if (id === 'TG-1042') {
    incident = {
      id: sharedIncident.id,
      status: sharedIncident.status,
      severity: sharedIncident.severity,
      location: sharedIncident.location,
      time: sharedIncident.timeline?.[0]?.time || 'Just now',
      signals: sharedIncident.signals,
      score: sharedIncident.score,
      latitude: window.tgLastLat || 25.5788,
      longitude: window.tgLastLng || 91.8933
    };
    tourist = { ...DEMO_TOURIST, isDemo: true };
    timeline = sharedIncident.timeline || DEMO_TIMELINE;
    contacts = [DEMO_TOURIST.emergencyContact];
  } else if (!isDemo && realIncident) {
    incident = {
      id: realIncident.id,
      status: realIncident.status,
      severity: realIncident.severity,
      location: realIncident.latitude ? `${realIncident.latitude.toFixed(4)}, ${realIncident.longitude.toFixed(4)}` : 'Unknown',
      time: new Date(realIncident.created_at).toLocaleTimeString(),
      signals: realIncident.detected_signals || [realIncident.incident_type],
      score: realIncident.risk_score || 0,
      latitude: realIncident.latitude,
      longitude: realIncident.longitude,
      accuracy: realIncident.location_accuracy_m
    };
    if (realTourist) {
      tourist = {
        name: realTourist.name || 'Unknown',
        id: realTourist.safety_id || realTourist.id,
        phone: realTourist.phone || 'Not provided',
        nationality: realTourist.nationality || 'Not provided',
        language: realTourist.preferred_language || 'Not provided',
        profile_photo: realTourist.profile_photo_url,
        date_of_birth: realTourist.date_of_birth || 'Not provided',
        gender: realTourist.gender || 'Not provided',
        medical_notes: realTourist.medical_notes || 'None',
        blood_group: realTourist.blood_group || 'Unknown',
        accessibility_notes: realTourist.accessibility_notes || 'None',
        travel_purpose: realTourist.travel_purpose || 'Not provided',
        planned_destination: realTourist.planned_destination || 'Not provided',
        trip_start_date: realTourist.trip_start_date || 'Not provided',
        trip_end_date: realTourist.trip_end_date || 'Not provided',
        home_city: realTourist.home_city || 'Not provided',
        home_country: realTourist.home_country || 'Not provided',
        isDemo: false
      };
    }
    contacts = realContacts.length > 0 ? realContacts.map(c => ({
      name: c.name,
      relation: c.relationship || 'Contact',
      phone: c.phone
    })) : [];
    
    // Generate a basic chronological timeline
    timeline = [
      { time: new Date(realIncident.created_at).toLocaleTimeString(), event: `Incident triggered (${realIncident.incident_type})`, severity: 'critical' }
    ];
    if (realIncident.updated_at && realIncident.updated_at !== realIncident.created_at) {
      timeline.unshift({ time: new Date(realIncident.updated_at).toLocaleTimeString(), event: `Status updated to ${realIncident.status}`, severity: 'high' });
    }
  } else if (isDemo) {
    const demoInc = DEMO_INCIDENTS.find(inc => inc.id === id);
    if (demoInc) {
      incident = { ...demoInc, latitude: 25.5788, longitude: 91.8933 };
    }
    tourist = { ...DEMO_TOURIST, isDemo: true };
    timeline = DEMO_TIMELINE;
    contacts = [DEMO_TOURIST.emergencyContact];
  }

  // Calculate live presence
  const { activeTourists } = useAuthorityRealtime();
  let liveTouristData = null;
  let liveStatus = 'OFFLINE';
  let liveTimeAgo = '';

  if (tourist && activeTourists && activeTourists[tourist.id]) {
    liveTouristData = activeTourists[tourist.id];
    const lastUpdate = new Date(liveTouristData.last_location_update);
    const diffMins = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
    
    if (diffMins < 2) {
      liveStatus = 'LIVE';
      liveTimeAgo = diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
    } else if (diffMins <= 5) {
      liveStatus = 'STALE';
      liveTimeAgo = `${diffMins}m ago`;
    } else {
      liveStatus = 'OFFLINE';
      liveTimeAgo = `>5m ago`;
    }
  }

  if (!incident || !tourist) {
    return (
      <div className="incident-detail-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading incident details...</p>
      </div>
    );
  }

  return (
    <div className="incident-detail-screen">
      <button className="incident-back-btn" onClick={() => navigate('/authority/risk-center')}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Back to Analytics
      </button>

      <div className="incident-header">
        <div>
          <div className="incident-title-row">
            <h1 className="incident-title">Active Incident Response</h1>
            <span className="incident-id">{incident.id}</span>
            <span className="incident-data-source" style={{
              background: isDemo ? 'var(--secondary)' : 'var(--primary)',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              {isDemo ? 'DEMO MODE' : 'LIVE • SUPABASE'}
            </span>
            <span className={`ai-risk-badge`} style={{
              background: incident.severity === 'CRITICAL' ? 'var(--error)' : incident.severity === 'HIGH' ? 'var(--caution)' : 'var(--safe)',
              color: '#fff'
            }}>
              {incident.status || incident.severity}
            </span>
          </div>
          <div className="incident-meta">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {incident.location} • Detected {incident.time}
          </div>
        </div>

        <div className="incident-actions">
          {isDemo ? (
            <>
              <button className="btn btn-secondary" onClick={() => acknowledgeIncident()}>
                Acknowledge
              </button>
              <button className="btn btn-emergency" onClick={() => escalateIncident()}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>escalator_warning</span>
                Escalate to Emergency Services
              </button>
            </>
          ) : (
            <>
              {incident.status === 'ACTIVE' && (
                <button className="btn btn-secondary" disabled={updating} onClick={() => updateIncidentStatus('ACKNOWLEDGED')}>
                  Acknowledge
                </button>
              )}
              {incident.status === 'ACKNOWLEDGED' && (
                <button className="btn btn-primary" disabled={updating} onClick={() => updateIncidentStatus('RESPONDING')}>
                  Dispatch Response
                </button>
              )}
              {incident.status === 'RESPONDING' && (
                <button className="btn btn-safe" style={{ backgroundColor: 'var(--safe)', color: '#fff' }} disabled={updating} onClick={() => updateIncidentStatus('RESOLVED')}>
                  Mark Resolved
                </button>
              )}
              {['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING'].includes(incident.status) && (
                <button className="btn btn-emergency" disabled={updating} onClick={() => updateIncidentStatus('ESCALATED')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>escalator_warning</span>
                  Escalate
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="incident-grid">
        {/* Left Column: Tourist Profile */}
        <div className="incident-left-col">
          <div className="incident-profile-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">person</span>
              Tourist Profile
            </h2>

            <div className="incident-profile-header">
              <div className="incident-avatar">
                {tourist.profile_photo ? (
                  <img src={tourist.profile_photo} alt={tourist.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  tourist.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div>
                <div className="incident-profile-name">{tourist.name}</div>
                <div className="incident-profile-phone">{tourist.phone}</div>
              </div>
            </div>

            <div className="incident-data-group">
              <div className="incident-data-label">Digital Safety ID</div>
              <div className="incident-data-value" style={{ fontFamily: 'monospace' }}>{tourist.id}</div>
            </div>

            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">Nationality</div>
                <div className="incident-data-value">{tourist.nationality}</div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">Language</div>
                <div className="incident-data-value">{tourist.language}</div>
              </div>
            </div>

            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">Gender</div>
                <div className="incident-data-value">{tourist.gender}</div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">DOB</div>
                <div className="incident-data-value">{tourist.date_of_birth}</div>
              </div>
            </div>
            
            <div className="incident-data-group">
              <div className="incident-data-label">Home Location</div>
              <div className="incident-data-value">{tourist.home_city ? `${tourist.home_city}, ${tourist.home_country}` : 'Not provided'}</div>
            </div>
          </div>
          
          <div className="incident-profile-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">health_and_safety</span>
              Safety Information
            </h2>
            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">Blood Group</div>
                <div className="incident-data-value" style={{ color: 'var(--error)', fontWeight: 'bold' }}>{tourist.blood_group}</div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">Medical Notes</div>
                <div className="incident-data-value">{tourist.medical_notes}</div>
              </div>
            </div>
            <div className="incident-data-group">
              <div className="incident-data-label">Accessibility Needs</div>
              <div className="incident-data-value">{tourist.accessibility_notes}</div>
            </div>
          </div>
        </div>

        {/* Center Column: Map & Signals */}
        <div className="incident-center-col">
          <div className="incident-map-card">
            <div className="incident-map-header">
              <span className="incident-section-title" style={{ margin: 0 }}>
                <span className="material-symbols-outlined">my_location</span>
                Live Location
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {liveStatus !== 'OFFLINE' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                    background: liveStatus === 'LIVE' ? '#dcfce7' : 'var(--caution-bg)',
                    color: liveStatus === 'LIVE' ? '#16a34a' : 'var(--caution)'
                  }}>
                    <div style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: liveStatus === 'LIVE' ? '#16a34a' : 'var(--caution)',
                      animation: liveStatus === 'LIVE' ? 'pulse 2s infinite' : 'none'
                    }} />
                    {liveStatus} ({liveTimeAgo})
                  </div>
                )}
                {liveStatus === 'OFFLINE' && (
                  <div style={{
                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                    background: 'var(--surface-variant)', color: 'var(--on-surface-variant)'
                  }}>
                    OFFLINE ({liveTimeAgo})
                  </div>
                )}
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${liveTouristData?.current_latitude || incident.latitude},${liveTouristData?.current_longitude || incident.longitude}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="incident-maps-link"
                >
                  Open in Maps
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                </a>
              </div>
            </div>
            <div className="incident-map-view" style={{ flex: 1, padding: 0 }}>
              {incident.latitude && incident.longitude ? (
                <InteractiveMap 
                  showAuthorityView={true} 
                  incidentState={incident} 
                  liveTouristData={liveTouristData}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--surface-tint)', padding: 'var(--space-xl)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: '8px' }}>map</span>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>GPS Location not provided</p>
                </div>
              )}
            </div>
            <div className="incident-map-footer">
              <div className="incident-map-coords">
                <strong>Incident:</strong> {incident.latitude?.toFixed(5)}, {incident.longitude?.toFixed(5)}
                <br />
                {liveTouristData && (
                  <span><strong>Live:</strong> {liveTouristData.current_latitude?.toFixed(5)}, {liveTouristData.current_longitude?.toFixed(5)}</span>
                )}
              </div>
              <div className="incident-map-accuracy">
                {incident.accuracy ? `Accuracy: ±${Math.round(incident.accuracy)}m` : 'Accuracy: Unknown'}
              </div>
            </div>
          </div>

          <div className="incident-signals-card" style={{
            background: incident.severity === 'CRITICAL' ? 'var(--error-container)' : incident.severity === 'HIGH' ? 'var(--caution-bg)' : '#dcfce7',
            color: incident.severity === 'CRITICAL' ? 'var(--on-error-container)' : incident.severity === 'HIGH' ? 'var(--caution)' : '#16a34a'
          }}>
            <h2 className="incident-signals-title">
              <span className="material-symbols-outlined">warning</span>
              Detected AI Risk Signals
            </h2>
            <div className="incident-signal-item">
              <span className="incident-signal-label">Safety Score</span>
              <span className="incident-signal-value">{incident.score}/100</span>
            </div>
            {incident.signals.map((sig, i) => (
              <div className="incident-signal-item" key={i}>
                <span className="incident-signal-label">{sig}</span>
                <span className="incident-signal-value">Alert</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Contacts & Timeline */}
        <div className="incident-right-col">
          <div className="incident-timeline-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">contact_phone</span>
              Emergency Contacts
            </h2>
            
            {contacts.length > 0 ? (
              contacts.map((contact, i) => (
                <div key={i} className="incident-emergency-contact">
                  <div className="incident-data-value" style={{ fontWeight: 600 }}>{contact.name} <span style={{ fontWeight: 400, color: 'var(--on-surface-variant)', fontSize: 12 }}>({contact.relation})</span></div>
                  <div className="incident-profile-phone" style={{ marginTop: '4px', fontSize: 15, color: 'var(--primary)' }}>{contact.phone}</div>
                  <div className="incident-contact-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <a href={`tel:${contact.phone}`} className="btn btn-interactive" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                      CALL
                    </a>
                    <button className="btn btn-secondary" style={{ flex: 1 }}>
                      NOTIFY
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--on-surface-variant)', fontSize: 13, padding: '12px 0' }}>No emergency contacts provided.</div>
            )}
          </div>

          <div className="incident-timeline-card" style={{ marginTop: 'var(--space-lg)' }}>
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">history</span>
              Incident Timeline
            </h2>

            <div className="incident-timeline">
              {timeline.map((item, index) => (
                <div key={index} className="incident-timeline-item">
                  <div className={`incident-timeline-dot ${item.severity}`} />
                  <div className="incident-timeline-time">{item.time}</div>
                  <div className="incident-timeline-event">{item.event}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
