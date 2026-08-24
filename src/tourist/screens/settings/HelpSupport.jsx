import { useNavigate } from 'react-router-dom';

export default function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/tourist/menu')} 
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Help & Support</h1>
      </div>
      
      <div style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>How Tourist Guardian Works</h2>
        <p style={{ fontSize: 14, marginBottom: 'var(--space-lg)', lineHeight: 1.5, fontWeight: 600, color: 'var(--primary)' }}>
          PREVENT → DETECT → RESPOND
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>How AI Safety Detection Works</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          The prototype combines contextual signals such as route deviation, inactivity, and area risk using an Explainable Prototype Risk Engine.
        </p>

        <div style={{ padding: 'var(--space-md)', background: 'var(--error-container)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-error-container)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>emergency</span>
            Emergency
          </h2>
          <p style={{ fontSize: 13, color: 'var(--on-error-container)', lineHeight: 1.4 }}>
            For a real emergency, contact local emergency services.
          </p>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-xs)' }}>About Tourist Guardian</h2>
        <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          Hackathon prototype.
        </p>

      </div>
    </div>
  );
}
