import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import { useLanguage } from '../../utils/LanguageContext';
import './SafetyCredential.css';

export default function SafetyCredential() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { touristProfile: profile, loading } = useAuth();
  const profileError = !loading && profile === null;

  if (profileError) {
    return (
      <div className="credential-screen animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 'var(--space-xl)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--error)', marginBottom: 'var(--space-md)' }}>error</span>
        <h2 style={{ fontSize: 24, marginBottom: 'var(--space-sm)' }}>Profile Not Found</h2>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)' }}>
          Your digital credential could not be loaded. Please complete your profile setup.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/tourist/onboarding')}>
          Complete Profile Setup
        </button>
      </div>
    );
  }

  if (!profile) return <div className="credential-screen" style={{display:'flex',justifyContent:'center',alignItems:'center'}}>Loading...</div>;

  const initials = profile.name.split(' ').map(n => n[0]).join('').substring(0, 2);

  return (
    <div className="credential-screen animate-fade-in">
      <div className="credential-header">
        <h1 className="credential-title">{t('digital_safety_id')}</h1>
        <p className="credential-subtitle">Prototype verification credential for authorities</p>
      </div>

      <div className="credential-card">
        <div className="credential-card-header">
          <span className="credential-brand">Tourist<br/>Guardian</span>
          <span className="credential-badge">PROTOTYPE VERIFIED</span>
        </div>

        <div className="credential-body">
          <div className="credential-photo" style={{ overflow: 'hidden' }}>
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div className="credential-info">
            <div className="credential-name">{profile.name}</div>
            
            <div className="credential-field">
              <div className="credential-label">Safety ID Number</div>
              <div className="credential-value" style={{ fontFamily: 'monospace' }}>{profile.safety_id || profile.id}</div>
            </div>
            
            <div className="credential-field">
              <div className="credential-label">{t('nationality')}</div>
              <div className="credential-value">{profile.nationality || 'India'}</div>
            </div>

            <div className="credential-field">
              <div className="credential-label">Preferred Language</div>
              <div className="credential-value">{profile.preferred_language || 'English'}</div>
            </div>
            
            <div className="credential-field">
              <div className="credential-label">KYC Status</div>
              <div className="credential-value" style={{ color: profile.kyc_status === 'VERIFIED' ? 'var(--safe)' : 'inherit', fontWeight: profile.kyc_status === 'VERIFIED' ? 600 : 'normal' }}>
                {profile.kyc_status || 'PENDING'}
              </div>
            </div>

            {profile.planned_destination && (
              <div className="credential-field">
                <div className="credential-label">{t('destination')}</div>
                <div className="credential-value">{profile.planned_destination}</div>
              </div>
            )}
            
            {profile.trip_start_date && profile.trip_end_date && (
              <div className="credential-field">
                <div className="credential-label">Travel Dates</div>
                <div className="credential-value">{profile.trip_start_date} to {profile.trip_end_date}</div>
              </div>
            )}
          </div>
        </div>

        <div className="credential-footer">
          <div>
            <div className="credential-label">{t('status')}</div>
            <div className="credential-status">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified_user</span>
              {profile.kyc_status === 'VERIFIED' ? t('verified').toUpperCase() : 'PENDING'}
            </div>
          </div>
          <div className="credential-qr-placeholder">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 32 }}>qr_code_2</span>
          </div>
        </div>
      </div>
      
      {profile.kyc_status === 'VERIFIED' && profile.blockchain_reference && (
        <div className="card" style={{ marginTop: '16px', background: 'var(--surface)', border: '1px solid var(--safe)', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--safe)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>link</span>
            Blockchain Verification
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--safe)', fontWeight: 600, fontSize: 16, marginBottom: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check_circle</span>
            VERIFIED
          </div>
          
          <div style={{ display: 'grid', gap: '12px', fontSize: 13 }}>
            <div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Reference</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{profile.blockchain_reference}</div>
            </div>
            
            <div>
              <div style={{ color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Issued</div>
              <div>{new Date(profile.digital_id_issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      )}

      <div className="credential-actions">
        <button className="btn btn-secondary btn-full">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          Download PDF Copy
        </button>
        <button className="btn btn-interactive btn-full">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
          Share Secure Link
        </button>
      </div>
      
      <p style={{ marginTop: 'var(--space-2xl)', fontSize: 12, color: 'var(--on-surface-variant)', textAlign: 'center', opacity: 0.7 }}>
        This is a blockchain-ready tamper-evident Digital Tourist ID prototype. Sensitive documents remain securely encrypted off-chain.
      </p>
    </div>
  );
}
