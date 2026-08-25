import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';
import { authoritySupabase } from '../../lib/supabase';
import { formatRelativeTime } from '../../utils/timeUtils';
import './AuthorityEFIRCenter.css';

export default function AuthorityEFIRCenter() {
  const navigate = useNavigate();
  const [eFirs, setEFirs] = useState([]);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // ACTIVE, ALL, RESOLVED
  const [loading, setLoading] = useState(true);

  const fetchEFirs = async () => {
    setLoading(true);
    try {
      const { data, error } = await authoritySupabase
        .from('e_firs')
        .select('*')
        .order('generated_at', { ascending: false });
      
      if (!error && data) {
        setEFirs(data);
      }
    } catch (err) {
      console.error('Failed to fetch E-FIRs', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authoritySupabase) return;

    fetchEFirs();

    const channel = authoritySupabase.channel('efir_center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'e_firs' }, () => {
        fetchEFirs();
      })
      .subscribe();

    return () => {
      authoritySupabase.removeChannel(channel);
    };
  }, []);

  const filteredFirs = eFirs.filter(fir => {
    if (activeTab === 'ACTIVE') return fir.status === 'ACTIVE';
    if (activeTab === 'RESOLVED') return fir.status === 'RESOLVED';
    return true; // ALL
  });

  return (
    <div className="efir-center-screen">
      <div className="efir-center-header">
        <h1>E-FIR & Missing Tourists</h1>
        <p>Electronic First Information Reports for Missing and Distressed Tourists</p>
      </div>

      <div className="efir-tabs">
        <button 
          className={`efir-tab ${activeTab === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setActiveTab('ACTIVE')}
        >
          ACTIVE CASES
        </button>
        <button 
          className={`efir-tab ${activeTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveTab('ALL')}
        >
          ALL E-FIRS
        </button>
        <button 
          className={`efir-tab ${activeTab === 'RESOLVED' ? 'active' : ''}`}
          onClick={() => setActiveTab('RESOLVED')}
        >
          RESOLVED
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>Loading E-FIRs...</div>
      ) : filteredFirs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: 8 }}>task</span>
          <p>No E-FIRs found in this category.</p>
        </div>
      ) : (
        <div className="efir-grid">
          {filteredFirs.map(fir => (
            <div key={fir.id} className="efir-card">
              <div className="efir-card-header">
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{fir.fir_reference}</div>
                  <h3 style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {fir.status === 'ACTIVE' && <span style={{ color: 'var(--error)' }}>🔴</span>}
                    {fir.tourist_name_snapshot}
                  </h3>
                </div>
                <div style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                  background: fir.status === 'ACTIVE' ? 'var(--error)' : 'var(--safe)',
                  color: '#fff'
                }}>
                  {fir.status}
                </div>
              </div>

              <div className="efir-card-body">
                <div className="efir-data-row">
                  <span className="material-symbols-outlined">badge</span>
                  <span>{fir.safety_id_snapshot}</span>
                </div>
                <div className="efir-data-row">
                  <span className="material-symbols-outlined">schedule</span>
                  <span>Generated {formatRelativeTime(fir.generated_at)}</span>
                </div>
                {fir.last_known_location_at && (
                  <div className="efir-data-row">
                    <span className="material-symbols-outlined">my_location</span>
                    <span>Last seen {formatRelativeTime(fir.last_known_location_at)}</span>
                  </div>
                )}
                
                <div style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Safety Score</div>
                    <div style={{ fontWeight: 'bold', color: fir.risk_severity_snapshot === 'CRITICAL' ? 'var(--error)' : fir.risk_severity_snapshot === 'HIGH' ? 'var(--caution)' : 'var(--safe)' }}>
                      {fir.safety_score_snapshot}/100
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>Risk</div>
                    <div style={{ fontWeight: 'bold' }}>{fir.risk_severity_snapshot}</div>
                  </div>
                </div>
              </div>

              <div className="efir-card-footer">
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                  onClick={() => navigate(`/authority/efir/${fir.id}`)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>visibility</span>
                  VIEW E-FIR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
