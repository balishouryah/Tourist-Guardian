import { useNavigate } from 'react-router-dom';

export default function PrivacyData() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/tourist/menu')} 
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Privacy & Data</h1>
      </div>
      
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>Location Sharing</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          Your location is used by the prototype to demonstrate safety monitoring and incident detection.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>Safety Profile</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          Your demo safety profile is used to personalize the Tourist Guardian experience.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>Data Sharing</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          Information is shared with the connected Authority dashboard during the live demonstration.
        </p>

        <div style={{ padding: 'var(--space-md)', background: 'var(--surface-variant)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
            Prototype Notice
          </h2>
          <p style={{ fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.4 }}>
            This hackathon prototype does not represent a production emergency-response system.
          </p>
        </div>

      </div>
    </div>
  );
}
