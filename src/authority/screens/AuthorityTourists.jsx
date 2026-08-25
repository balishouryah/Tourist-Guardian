import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authoritySupabase } from '../../lib/supabase';
import { useAuthorityRealtime } from '../utils/AuthorityRealtimeContext';

export default function AuthorityTourists() {
  const navigate = useNavigate();
  const { activeTourists } = useAuthorityRealtime();
  
  const [tourists, setTourists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE, KYC VERIFIED, KYC PENDING, KYC REJECTED, CRITICAL, HIGH, CAUTION, SAFE

  useEffect(() => {
    let isMounted = true;
    
    const fetchTourists = async () => {
      try {
        const { data, error } = await authoritySupabase.rpc('get_authority_tourist_directory');
        if (error) throw error;
        
        if (isMounted) {
          setTourists(data || []);
        }
      } catch (err) {
        console.error('Error fetching tourists:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchTourists();
    
    // Set up a channel to listen for insert/update on tourists
    const channel = authoritySupabase.channel('tourists_directory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tourists' }, () => {
        // Re-fetch to get any updated emails via the view
        fetchTourists();
      })
      .subscribe();
      
    return () => {
      isMounted = false;
      authoritySupabase.removeChannel(channel);
    };
  }, []);

  // Compute live data vs static data
  const getProcessedTourists = () => {
    return tourists.map(t => {
      const live = activeTourists[t.id] || {};
      const isLiveActive = !!activeTourists[t.id];
      const severity = live.current_safety_severity || t.current_safety_severity || 'SAFE';
      const score = live.current_safety_score || t.current_safety_score || 100;
      const kycStatus = t.kyc_status || 'PENDING';
      
      return {
        ...t,
        computedSeverity: severity,
        computedScore: score,
        computedKyc: kycStatus,
        isLiveActive
      };
    });
  };

  const processed = getProcessedTourists();

  // Apply filters and search
  const filteredTourists = processed.filter(t => {
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !t.name?.toLowerCase().includes(q) &&
        !t.email?.toLowerCase().includes(q) &&
        !t.safety_id?.toLowerCase().includes(q) &&
        !t.phone?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    
    // Filter
    if (filter === 'ACTIVE') return t.isLiveActive;
    if (filter === 'INACTIVE') return !t.isLiveActive;
    if (filter === 'KYC VERIFIED') return t.computedKyc === 'VERIFIED';
    if (filter === 'KYC PENDING') return t.computedKyc === 'PENDING';
    if (filter === 'KYC REJECTED') return t.computedKyc === 'REJECTED';
    if (filter === 'CRITICAL') return t.computedSeverity === 'CRITICAL';
    if (filter === 'HIGH') return t.computedSeverity === 'HIGH';
    if (filter === 'CAUTION') return t.computedSeverity === 'CAUTION';
    if (filter === 'SAFE') return t.computedSeverity === 'SAFE';
    
    return true; // ALL
  });

  // Analytics counts
  const countActive = processed.filter(t => t.isLiveActive).length;
  const countKycVerified = processed.filter(t => t.computedKyc === 'VERIFIED').length;
  const countKycPending = processed.filter(t => t.computedKyc === 'PENDING').length;

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#fff' }}>Loading tourist directory...</div>;
  }

  return (
    <div style={{ padding: 'var(--space-2xl) var(--space-3xl)' }}>
      <h1 style={{ fontSize: 24, margin: '0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--primary)' }}>groups</span>
        TOURIST DIRECTORY
      </h1>
      <p style={{ margin: '8px 0 32px 0', color: 'var(--on-surface-variant)', fontSize: 14 }}>
        View and manage registered Tourist Guardian users.
      </p>
      
      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--surface-variant)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: '4px' }}>REGISTERED TOURISTS</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{tourists.length}</div>
        </div>
        <div style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: '4px' }}>ACTIVE NOW</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{countActive}</div>
        </div>
        <div style={{ background: 'var(--safe-container, #dcfce7)', color: 'var(--safe, #16a34a)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: '4px' }}>KYC VERIFIED</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{countKycVerified}</div>
        </div>
        <div style={{ background: 'var(--caution-bg, #fef08a)', color: 'var(--caution, #ca8a04)', padding: '16px', borderRadius: '12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: '4px' }}>KYC PENDING</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{countKycPending}</div>
        </div>
      </div>
      
      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--on-surface-variant)' }}>search</span>
          <input 
            type="text" 
            placeholder="Search tourists by name, email, phone, or ID..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)' }}
          />
        </div>
        
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)', minWidth: '150px' }}
        >
          <option value="ALL">All Tourists</option>
          <option value="ACTIVE">Active Now</option>
          <option value="INACTIVE">Inactive</option>
          <option value="KYC VERIFIED">KYC Verified</option>
          <option value="KYC PENDING">KYC Pending</option>
          <option value="KYC REJECTED">KYC Rejected</option>
          <option value="CRITICAL">Risk: Critical</option>
          <option value="HIGH">Risk: High</option>
          <option value="CAUTION">Risk: Caution</option>
          <option value="SAFE">Risk: Safe</option>
        </select>
      </div>
      
      {/* Table */}
      <div style={{ 
        background: 'var(--surface)', 
        borderRadius: '16px',
        border: '1px solid var(--outline-variant)',
        overflow: 'auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(150px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(200px, 1.5fr) 120px', padding: '16px', background: 'var(--surface-variant)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--on-surface-variant)', gap: '16px' }}>
          <div>Tourist</div>
          <div>Digital Safety ID</div>
          <div>Nationality</div>
          <div>KYC Status</div>
          <div>Safety Score</div>
          <div>Risk Status</div>
          <div>Location / Blockchain</div>
          <div style={{ textAlign: 'right' }}>Action</div>
        </div>
        
        {filteredTourists.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No tourists found.</div>
        ) : (
          filteredTourists.map((t, idx) => (
            <div key={t.id} style={{ 
              display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(150px, 1.5fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(200px, 1.5fr) 120px', padding: '16px', 
              borderTop: idx > 0 ? '1px solid var(--outline-variant)' : 'none',
              alignItems: 'center',
              gap: '16px',
              fontSize: 14
            }}>
              {/* Tourist Info */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.email || t.phone || 'No contact'}</div>
              </div>
              
              {/* Safety ID */}
              <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                {t.safety_id}
              </div>
              
              {/* Nationality */}
              <div>{t.nationality || '-'}</div>
              
              {/* KYC */}
              <div>
                <span style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: 11, fontWeight: 700,
                  background: t.computedKyc === 'VERIFIED' ? 'var(--safe-container, #dcfce7)' : t.computedKyc === 'REJECTED' ? 'var(--error-container, #fee2e2)' : 'var(--caution-bg, #fef08a)',
                  color: t.computedKyc === 'VERIFIED' ? 'var(--safe, #16a34a)' : t.computedKyc === 'REJECTED' ? 'var(--error, #dc2626)' : 'var(--caution, #ca8a04)'
                }}>
                  {t.computedKyc}
                </span>
              </div>
              
              {/* Score */}
              <div style={{ fontWeight: 700 }}>
                {t.computedScore}/100
              </div>
              
              {/* Risk Status */}
              <div>
                <span style={{ 
                  padding: '4px 8px', borderRadius: '4px', fontSize: 11, fontWeight: 700,
                  background: t.computedSeverity === 'CRITICAL' ? 'var(--error)' : t.computedSeverity === 'HIGH' ? 'var(--caution)' : 'transparent',
                  color: ['CRITICAL', 'HIGH'].includes(t.computedSeverity) ? '#fff' : 'var(--safe)',
                  border: t.computedSeverity === 'SAFE' ? '1px solid var(--safe)' : 'none'
                }}>
                  {t.computedSeverity}
                </span>
                {t.isLiveActive && (
                  <div style={{ display: 'inline-block', width: 6, height: 6, background: 'var(--primary)', borderRadius: '50%', marginLeft: 6, animation: 'pulse 2s infinite' }} title="Active Now" />
                )}
              </div>
              
              {/* Location & Blockchain */}
              <div style={{ fontSize: 12 }}>
                {(t.current_latitude && t.current_longitude) ? (
                  <div style={{ color: 'var(--on-surface-variant)' }}>
                    {t.current_latitude.toFixed(4)}, {t.current_longitude.toFixed(4)}
                  </div>
                ) : (
                  <div style={{ color: 'var(--outline)' }}>Unknown Location</div>
                )}
                
                {t.blockchain_reference && (
                  <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--safe)', fontSize: 11, fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                    BLOCKCHAIN ID
                  </div>
                )}
              </div>
              
              {/* Action */}
              <div style={{ textAlign: 'right' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => navigate(`/authority/tourist/${t.id}`)}
                  style={{ padding: '8px 12px', fontSize: 12 }}
                >
                  VIEW TOURIST
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
