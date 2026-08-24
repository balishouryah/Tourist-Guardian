import { useState, useEffect } from 'react';
import { authoritySupabase } from '../../lib/supabase';
import { formatRelativeTime } from '../../utils/timeUtils';
import KYCReviewModal from '../components/KYCReviewModal';
import './AuthorityKYCCenter.css';

export default function AuthorityKYCCenter() {
  const [tourists, setTourists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // ALL, PENDING, VERIFIED, REJECTED
  const [selectedTourist, setSelectedTourist] = useState(null);

  const fetchTourists = async () => {
    try {
      const { data, error } = await authoritySupabase
        .from('tourists')
        .select('*')
        .not('kyc_status', 'in', '("NOT_SUBMITTED")') // only those who have interacted with KYC
        .order('kyc_submitted_at', { ascending: false, nullsFirst: false });
        
      if (error) throw error;
      
      // Additional safety filter: don't show PENDING if they haven't actually submitted a document
      const validTourists = (data || []).filter(t => {
        if (t.kyc_status === 'PENDING' && !t.kyc_submitted_at && !t.kyc_document_path) return false;
        return true;
      });
      
      setTourists(validTourists);
    } catch (err) {
      console.error('Failed to fetch KYC tourists', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTourists();

    // Subscribe to realtime updates for tourists table to catch new KYC submissions
    const channel = authoritySupabase.channel('authority_kyc_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tourists' }, () => {
        fetchTourists();
      })
      .subscribe();

    return () => {
      authoritySupabase.removeChannel(channel);
    };
  }, []);

  const handleKYCSuccess = (touristId, newStatus) => {
    // Update local state instantly so UI feels responsive
    setTourists(prev => prev.map(t => 
      t.id === touristId ? { ...t, kyc_status: newStatus } : t
    ));
    setSelectedTourist(null);
  };

  const filteredTourists = tourists.filter(t => {
    if (filter === 'ALL') return !!t.kyc_status && t.kyc_status !== 'NOT_SUBMITTED';
    return t.kyc_status === filter;
  });

  return (
    <div className="authority-screen kyc-center-screen">
      <div className="authority-header">
        <h1 className="authority-title">KYC VERIFICATION</h1>
        <p className="authority-subtitle">Review and manage Digital Tourist ID applications.</p>
      </div>

      <div className="kyc-tabs">
        {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map(f => (
          <button 
            key={f}
            className={`kyc-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === 'PENDING' && tourists.filter(t => t.kyc_status === 'PENDING').length > 0 && (
              <span className="kyc-badge">{tourists.filter(t => t.kyc_status === 'PENDING').length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="kyc-list-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading KYC requests...</div>
        ) : filteredTourists.length === 0 ? (
          <div className="kyc-empty">
            <span className="material-symbols-outlined">inbox</span>
            <p>No {filter.toLowerCase()} KYC requests found.</p>
          </div>
        ) : (
          <div className="kyc-grid">
            {filteredTourists.map(tourist => (
              <div key={tourist.id} className="kyc-card">
                <div className="kyc-card-header">
                  <div>
                    <h3 className="kyc-tourist-name">{tourist.name}</h3>
                    <div className="kyc-tourist-id">{tourist.safety_id}</div>
                  </div>
                  <div className={`kyc-status-badge ${tourist.kyc_status?.toLowerCase()}`}>
                    {tourist.kyc_status === 'PENDING' ? '🟡 PENDING' : tourist.kyc_status === 'VERIFIED' ? '🟢 VERIFIED' : '🔴 REJECTED'}
                  </div>
                </div>
                
                <div className="kyc-card-body">
                  <div className="kyc-info-row">
                    <span>Document:</span>
                    <strong>{tourist.kyc_type}</strong>
                  </div>
                  <div className="kyc-info-row">
                    <span>Submitted:</span>
                    <strong>{tourist.kyc_submitted_at ? formatRelativeTime(tourist.kyc_submitted_at) : 'Unknown'}</strong>
                  </div>
                </div>

                <div className="kyc-card-footer">
                  <button className="btn btn-primary btn-block" onClick={() => setSelectedTourist(tourist)}>
                    REVIEW KYC
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTourist && (
        <KYCReviewModal 
          tourist={selectedTourist} 
          onClose={() => setSelectedTourist(null)} 
          onSuccess={handleKYCSuccess}
        />
      )}
    </div>
  );
}
