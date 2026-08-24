import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { authoritySupabase } from '../../lib/supabase';
import InteractiveMap from '../../components/InteractiveMap';
import { formatRelativeTime } from '../../utils/timeUtils';
import './IncidentDetail.css';

export default function IncidentDetail() {
  const { id } = useParams(); // This is now the tourist ID
  const navigate = useNavigate();
  const { activeTourists } = useAuthorityRealtime();
  
  const [realTourist, setRealTourist] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [safetyEvents, setSafetyEvents] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authoritySupabase) return;

    let isMounted = true;
    
    const fetchTouristData = async () => {
      setLoading(true);
      try {
        // Fetch Tourist
        const { data: tourist } = await authoritySupabase
          .from('tourists')
          .select('*')
          .eq('id', id)
          .single();
          
        if (!tourist && isMounted) {
          // Maybe it's a safety_id?
          const { data: touristBySafety } = await authoritySupabase
            .from('tourists')
            .select('*')
            .eq('safety_id', id)
            .single();
            
          if (touristBySafety && isMounted) {
            setRealTourist(touristBySafety);
          }
        } else if (tourist && isMounted) {
          setRealTourist(tourist);
        }

        const tId = tourist?.id || (isMounted && realTourist?.id) || id;

        // Fetch Incidents
        const { data: incs } = await authoritySupabase
          .from('incidents')
          .select('*')
          .eq('tourist_id', tId)
          .order('created_at', { ascending: false });
        if (incs && isMounted) setIncidents(incs);

        // Fetch Safety Events
        const { data: events } = await authoritySupabase
          .from('safety_events')
          .select('*')
          .eq('tourist_id', tId)
          .order('created_at', { ascending: false });
        if (events && isMounted) setSafetyEvents(events);

        // Fetch Contacts
        const { data: conts } = await authoritySupabase
          .from('emergency_contacts')
          .select('*')
          .eq('tourist_id', tId);
        if (conts && isMounted) setContacts(conts);

      } catch (err) {
        console.error('Failed to fetch tourist details', err);
      }
      if (isMounted) setLoading(false);
    };

    fetchTouristData();

    // Subscribe to realtime updates for this tourist's data
    const channel = authoritySupabase.channel(`tourist_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents', filter: `tourist_id=eq.${id}` }, () => {
        fetchTouristData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'safety_events', filter: `tourist_id=eq.${id}` }, () => {
        fetchTouristData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tourists', filter: `id=eq.${id}` }, () => {
        fetchTouristData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      authoritySupabase.removeChannel(channel);
    };
  }, [id]);

  const updateIncidentStatus = async (incidentId, newStatus) => {
    const { error } = await authoritySupabase.from('incidents').update({ status: newStatus }).eq('id', incidentId);
    if (!error) {
      setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
    }
  };

  if (loading) {
    return (
      <div className="incident-detail-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading tourist data...</p>
      </div>
    );
  }

  if (!realTourist) {
    return (
      <div className="incident-detail-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)' }}>error</span>
        <h2>Tourist Not Found</h2>
        <p>The requested tourist ID does not exist in the database.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/authority/dashboard')}>Go Back</button>
      </div>
    );
  }

  const liveTouristData = activeTourists[realTourist.id];
  const liveStatus = liveTouristData ? 'LIVE' : 'OFFLINE';
  
  // Calculate priority score directly from live tourist or DB
  const currentSeverity = liveTouristData?.current_safety_severity || realTourist.current_safety_severity || 'SAFE';
  const currentScore = liveTouristData?.current_safety_score || realTourist.current_safety_score || 100;
  
  const activeSOSList = incidents.filter(i => ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'ESCALATED'].includes(i.status));
  const currentActiveSOS = activeSOSList.length > 0 ? [activeSOSList[0]] : [];
  const historicalSOS = incidents.filter(i => !currentActiveSOS.some(active => active.id === i.id));

  return (
    <div className="incident-detail-screen">
      <button className="incident-back-btn" onClick={() => navigate('/authority/dashboard')}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
        Back to Dashboard
      </button>

      <div className="incident-header">
        <div>
          <div className="incident-title-row">
            <h1 className="incident-title">{realTourist.name.toUpperCase()}</h1>
            <span className="incident-id">{realTourist.safety_id}</span>
            <span className={`ai-risk-badge`} style={{
              background: currentSeverity === 'CRITICAL' || currentActiveSOS.length > 0 ? 'var(--error)' : currentSeverity === 'HIGH' ? 'var(--caution)' : 'var(--safe)',
              color: '#fff'
            }}>
              {currentActiveSOS.length > 0 ? 'ACTIVE SOS' : currentSeverity}
            </span>
          </div>
          <div className="incident-meta">
            Safety Score: {currentScore}/100 • {incidents.length} Total Incidents
          </div>
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
                {realTourist.profile_photo_url ? (
                  <img src={realTourist.profile_photo_url} alt={realTourist.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  realTourist.name.split(' ').map(n => n[0]).join('')
                )}
              </div>
              <div>
                <div className="incident-profile-name">{realTourist.name}</div>
                <div className="incident-profile-phone">{realTourist.phone || 'No phone'}</div>
              </div>
            </div>
            <div className="incident-data-group">
              <div className="incident-data-label">Digital Safety ID</div>
              <div className="incident-data-value" style={{ fontFamily: 'monospace' }}>{realTourist.safety_id}</div>
            </div>
            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">Nationality</div>
                <div className="incident-data-value">{realTourist.nationality || 'Not provided'}</div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">Language</div>
                <div className="incident-data-value">{realTourist.preferred_language || 'Not provided'}</div>
              </div>
            </div>
          </div>

          <div className="incident-profile-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">id_card</span>
              KYC & Digital Identity
            </h2>
            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">KYC Status</div>
                <div className="incident-data-value" style={{ 
                  color: realTourist.kyc_status === 'VERIFIED' ? 'var(--safe)' : 
                         realTourist.kyc_status === 'REJECTED' ? 'var(--error)' : 'var(--caution)', 
                  fontWeight: 'bold' 
                }}>
                  {realTourist.kyc_status || 'PENDING'}
                </div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">Blockchain</div>
                <div className="incident-data-value" style={{ 
                  color: realTourist.blockchain_status === 'VERIFIED' ? 'var(--safe)' : 
                         realTourist.blockchain_status === 'REJECTED' ? 'var(--error)' : 'var(--caution)', 
                  fontWeight: 'bold' 
                }}>
                  {realTourist.blockchain_status || 'PENDING'}
                </div>
              </div>
            </div>
            
            {realTourist.kyc_status === 'VERIFIED' && (
              <>
                <div className="incident-data-row" style={{ marginTop: '8px' }}>
                  <div className="incident-data-group">
                    <div className="incident-data-label">Document</div>
                    <div className="incident-data-value">{realTourist.kyc_type} {realTourist.kyc_reference}</div>
                  </div>
                </div>
                <div className="incident-data-group" style={{ marginTop: '8px' }}>
                  <div className="incident-data-label">Verification ID</div>
                  <div className="incident-data-value" style={{ fontFamily: 'monospace', fontSize: '11px' }}>{realTourist.blockchain_reference}</div>
                </div>
                <div className="incident-data-row" style={{ marginTop: '8px' }}>
                  <div className="incident-data-group">
                    <div className="incident-data-label">Issued</div>
                    <div className="incident-data-value" style={{ fontSize: '12px' }}>
                      {realTourist.digital_id_issued_at ? new Date(realTourist.digital_id_issued_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div className="incident-data-group">
                    <div className="incident-data-label">Expires</div>
                    <div className="incident-data-value" style={{ fontSize: '12px' }}>
                      {realTourist.digital_id_expires_at ? new Date(realTourist.digital_id_expires_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="incident-profile-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">health_and_safety</span>
              Safety Information
            </h2>
            <div className="incident-data-row">
              <div className="incident-data-group">
                <div className="incident-data-label">Blood Group</div>
                <div className="incident-data-value" style={{ color: 'var(--error)', fontWeight: 'bold' }}>{realTourist.blood_group || 'Unknown'}</div>
              </div>
              <div className="incident-data-group">
                <div className="incident-data-label">Medical Notes</div>
                <div className="incident-data-value">{realTourist.medical_notes || 'None'}</div>
              </div>
            </div>
            <div className="incident-data-group">
              <div className="incident-data-label">Emergency Contacts</div>
              {contacts.length > 0 ? contacts.map((c, i) => (
                <div key={i} style={{ marginTop: '8px', padding: '8px', background: 'var(--surface-variant)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600 }}>{c.name} <span style={{ fontWeight: 'normal', fontSize: 12 }}>({c.relationship})</span></div>
                  <div style={{ color: 'var(--primary)', fontSize: 13 }}>{c.phone}</div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>No contacts.</div>
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Map & Active SOS */}
        <div className="incident-center-col">
          
          {/* Active Emergency Action Area */}
          {currentActiveSOS.length > 0 && (
            <div className="incident-action-card" style={{ 
              background: 'var(--surface-container-highest)', 
              padding: '20px', 
              borderRadius: '16px', 
              marginBottom: '16px',
              border: '2px solid var(--error)'
            }}>
              <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                <span className="material-symbols-outlined icon-filled">emergency_share</span>
                ACTIVE EMERGENCY ACTIONS
              </h2>
              
              {currentActiveSOS.map(inc => (
                <div key={inc.id} style={{ padding: '16px', background: 'var(--surface)', borderRadius: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <strong style={{ fontSize: '16px' }}>SOS Incident</strong>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      background: inc.status === 'ACTIVE' ? 'var(--error)' : 'var(--primary)',
                      color: '#fff'
                    }}>{inc.status}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {inc.status === 'ACTIVE' && (
                      <button className="btn btn-primary" onClick={() => updateIncidentStatus(inc.id, 'ACKNOWLEDGED')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                        ACKNOWLEDGE INCIDENT
                      </button>
                    )}
                    {inc.status === 'ACKNOWLEDGED' && (
                      <button className="btn btn-primary" onClick={() => updateIncidentStatus(inc.id, 'RESPONDING')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 'bold', background: '#16a34a', color: '#fff', border: 'none' }}>
                        MARK AS RESPONDING
                      </button>
                    )}
                    {inc.status === 'RESPONDING' && (
                      <button className="btn btn-secondary" onClick={() => updateIncidentStatus(inc.id, 'ESCALATED')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                        ESCALATE
                      </button>
                    )}
                    {['ACTIVE', 'ACKNOWLEDGED', 'RESPONDING', 'ESCALATED'].includes(inc.status) && (
                      <button className="btn btn-secondary" onClick={() => updateIncidentStatus(inc.id, 'RESOLVED')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                        RESOLVE INCIDENT
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="incident-map-card">
            <div className="incident-map-header">
              <span className="incident-section-title" style={{ margin: 0 }}>
                <span className="material-symbols-outlined">my_location</span>
                Live Location
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                  background: liveStatus === 'LIVE' ? '#dcfce7' : 'var(--surface-variant)',
                  color: liveStatus === 'LIVE' ? '#16a34a' : 'var(--on-surface-variant)'
                }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: liveStatus === 'LIVE' ? '#16a34a' : 'var(--on-surface-variant)',
                    animation: liveStatus === 'LIVE' ? 'pulse 2s infinite' : 'none'
                  }} />
                  {liveStatus} ({formatRelativeTime(liveTouristData?.last_location_update || realTourist.last_location_update)})
                </div>
              </div>
            </div>
            
            <div className="incident-map-view" style={{ flex: 1, padding: 0 }}>
              {(liveTouristData?.current_latitude || realTourist.current_latitude) ? (
                <InteractiveMap 
                  showAuthorityView={true} 
                  liveTouristData={liveTouristData || realTourist}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--surface-tint)', padding: 'var(--space-xl)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: '8px' }}>map</span>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>GPS Location not provided</p>
                </div>
              )}
            </div>
          </div>

          <div className="incident-signals-card" style={{
            background: currentSeverity === 'CRITICAL' ? 'var(--error-container)' : currentSeverity === 'HIGH' ? 'var(--caution-bg)' : '#dcfce7',
            color: currentSeverity === 'CRITICAL' ? 'var(--on-error-container)' : currentSeverity === 'HIGH' ? 'var(--caution)' : '#16a34a'
          }}>
            <h2 className="incident-signals-title">
              <span className="material-symbols-outlined">warning</span>
              Current Status: {currentSeverity}
            </h2>
            <div className="incident-signal-item">
              <span className="incident-signal-label">Safety Score</span>
              <span className="incident-signal-value">{currentScore}/100</span>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', opacity: 0.8 }}>
                AI Behavioural Signals
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(liveTouristData?.current_safety_signals || realTourist.current_safety_signals || []).map((sig, i) => (
                  <div key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    {currentSeverity !== 'SAFE' && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>warning</span>}
                    {sig}
                  </div>
                ))}
                {(!liveTouristData?.current_safety_signals && !realTourist.current_safety_signals?.length) && (
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>No anomalies detected</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SOS History & Safety History */}
        <div className="incident-right-col">
          <div className="incident-timeline-card">
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">emergency</span>
              SOS History
            </h2>
            <div className="incident-timeline">
              {historicalSOS.length > 0 ? historicalSOS.map((inc, index) => {
                const originalIndex = incidents.findIndex(i => i.id === inc.id);
                return (
                <div key={inc.id} className="incident-timeline-item" style={{ padding: '12px', background: 'var(--surface-variant)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>SOS #{incidents.length - originalIndex}</strong>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{formatRelativeTime(inc.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: '4px' }}>Status: <strong>{inc.status}</strong></div>
                  
                  {['ACTIVE', 'ACKNOWLEDGED'].includes(inc.status) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {inc.status === 'ACTIVE' && (
                        <button className="btn btn-secondary" onClick={() => updateIncidentStatus(inc.id, 'ACKNOWLEDGED')} style={{ fontSize: 11, padding: '4px 8px' }}>ACKNOWLEDGE</button>
                      )}
                      {inc.status === 'ACKNOWLEDGED' && (
                        <button className="btn btn-primary" onClick={() => updateIncidentStatus(inc.id, 'RESPONDING')} style={{ fontSize: 11, padding: '4px 8px' }}>MARK RESPONDING</button>
                      )}
                      {inc.status === 'RESPONDING' && (
                        <button className="btn btn-secondary" onClick={() => updateIncidentStatus(inc.id, 'ESCALATED')} style={{ fontSize: 11, padding: '4px 8px' }}>ESCALATE</button>
                      )}
                      <button className="btn btn-safe" onClick={() => updateIncidentStatus(inc.id, 'RESOLVED')} style={{ fontSize: 11, padding: '4px 8px', background: 'var(--safe)', color: '#fff', border: 'none' }}>RESOLVE</button>
                    </div>
                  )}
                </div>
                );
              }) : (
                <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>No SOS history.</div>
              )}
            </div>
          </div>

          <div className="incident-timeline-card" style={{ marginTop: 'var(--space-lg)' }}>
            <h2 className="incident-section-title">
              <span className="material-symbols-outlined">history</span>
              Safety History
            </h2>
            <div className="incident-timeline">
              {safetyEvents.length > 0 ? safetyEvents.map((evt, index) => (
                <div key={index} className="incident-timeline-item" style={{ marginBottom: '16px' }}>
                  <div className={`incident-timeline-dot ${evt.severity === 'CRITICAL' ? 'critical' : evt.severity === 'HIGH' ? 'high' : 'safe'}`} />
                  <div className="incident-timeline-time">{formatRelativeTime(evt.created_at)}</div>
                  <div className="incident-timeline-event">
                    <strong>{evt.event_type}</strong>
                    <br />
                    Score: {evt.risk_score} | {evt.severity}
                  </div>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>No safety events recorded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
