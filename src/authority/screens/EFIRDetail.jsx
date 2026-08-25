import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authoritySupabase } from '../../lib/supabase';
import { formatRelativeTime } from '../../utils/timeUtils';
import InteractiveMap from '../../components/InteractiveMap';
import './EFIRDetail.css';

export default function EFIRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [efir, setEfir] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEfir = async () => {
      setLoading(true);
      try {
        const { data, error } = await authoritySupabase
          .from('e_firs')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data && !error) {
          setEfir(data);
        }
      } catch (err) {
        console.error('Error fetching E-FIR:', err);
      }
      setLoading(false);
    };

    fetchEfir();
  }, [id]);

  const handleResolve = async () => {
    if (!window.confirm('MARK E-FIR AS RESOLVED?')) return;
    
    try {
      const { error } = await authoritySupabase
        .from('e_firs')
        .update({ 
          status: 'RESOLVED',
          resolved_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (!error) {
        setEfir(prev => ({ ...prev, status: 'RESOLVED', resolved_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error('Failed to resolve E-FIR:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading E-FIR...</div>;
  }

  if (!efir) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)' }}>error</span>
        <h2>E-FIR Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/authority/efirs')}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="efir-detail-screen">
      {/* Hide controls from print */}
      <div className="efir-controls no-print">
        <button className="btn btn-secondary" onClick={() => navigate('/authority/efirs')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
          Back to E-FIRs
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            DOWNLOAD PDF
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span>
            PRINT
          </button>
          {efir.status === 'ACTIVE' && (
            <button className="btn btn-primary" onClick={handleResolve} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#16a34a', border: 'none', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              MARK RESOLVED
            </button>
          )}
        </div>
      </div>

      <div className="efir-report-container">
        <div className="efir-report-header">
          <h2>TOURIST GUARDIAN</h2>
          <h1>E-FIR / MISSING TOURIST REPORT</h1>
          <div className="efir-report-meta">
            <div>
              <strong>E-FIR Reference:</strong><br />
              {efir.fir_reference}
            </div>
            <div>
              <strong>Status:</strong><br />
              {efir.status === 'ACTIVE' ? '🔴 ACTIVE / MISSING' : '🟢 RESOLVED'}
            </div>
            <div>
              <strong>Generated:</strong><br />
              {new Date(efir.generated_at).toLocaleString()}
            </div>
          </div>
          <div style={{ marginTop: '16px', fontSize: '13px' }}>
            <strong>REPORTING AUTHORITY:</strong> System Auto-Generated / Operator
          </div>
        </div>

        <div className="efir-report-section">
          <h3>TOURIST INFORMATION</h3>
          <div className="efir-report-grid">
            <div>
              <strong>Name:</strong> {efir.tourist_name_snapshot}
            </div>
            <div>
              <strong>Digital Tourist ID:</strong> {efir.safety_id_snapshot}
            </div>
            <div>
              <strong>Nationality:</strong> {efir.nationality_snapshot || 'Not provided'}
            </div>
            <div>
              <strong>Phone:</strong> {efir.phone_snapshot || 'Not provided'}
            </div>
            <div>
              <strong>KYC Status:</strong> {efir.kyc_status_snapshot || 'PENDING'}
            </div>
          </div>
        </div>

        <div className="efir-report-section">
          <h3>LAST KNOWN LOCATION</h3>
          {efir.last_known_latitude && efir.last_known_longitude ? (
            <div>
              <div className="efir-report-grid">
                <div>
                  <strong>Latitude:</strong> {efir.last_known_latitude}
                </div>
                <div>
                  <strong>Longitude:</strong> {efir.last_known_longitude}
                </div>
                <div>
                  <strong>Last Updated:</strong> {new Date(efir.last_known_location_at).toLocaleString()}
                </div>
              </div>
              <div className="efir-map-container no-print">
                <InteractiveMap 
                  liveTouristData={{ 
                    current_latitude: efir.last_known_latitude, 
                    current_longitude: efir.last_known_longitude,
                    name: efir.tourist_name_snapshot
                  }} 
                  showAuthorityView={true}
                />
              </div>
            </div>
          ) : (
            <p>No location data available.</p>
          )}
        </div>

        <div className="efir-report-section">
          <h3>SAFETY INFORMATION</h3>
          <div className="efir-report-grid">
            <div>
              <strong>Safety Score:</strong> {efir.safety_score_snapshot}/100
            </div>
            <div>
              <strong>Risk Level:</strong> {efir.risk_severity_snapshot}
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <strong>Current Risk Signals:</strong>
            <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
              {efir.risk_signals_snapshot && efir.risk_signals_snapshot.length > 0 ? (
                efir.risk_signals_snapshot.map((sig, i) => (
                  <li key={i}>{sig}</li>
                ))
              ) : (
                <li>No anomalies detected at generation time.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="efir-report-section">
          <h3>INCIDENT INFORMATION</h3>
          <div>
            <strong>Incident Summary:</strong>
            <p style={{ marginTop: '8px', whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '12px', border: '1px solid #e0e0e0', color: '#000' }}>
              {efir.incident_summary || 'No additional incident summary provided.'}
            </p>
          </div>
        </div>

        {efir.status === 'RESOLVED' && (
          <div className="efir-report-section">
            <h3>RESOLUTION INFORMATION</h3>
            <div className="efir-report-grid">
              <div>
                <strong>Resolved At:</strong> {new Date(efir.resolved_at).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div className="efir-report-disclaimer">
          <strong>DISCLAIMER:</strong> This is a prototype electronic incident/missing-person report generated by Tourist Guardian for authority workflow demonstration. This report has NOT been officially filed with a government police database.
        </div>
      </div>
    </div>
  );
}
