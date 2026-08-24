import { useNavigate } from 'react-router-dom';

export default function LanguageSettings() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', background: 'var(--background)' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, display: 'flex', cursor: 'pointer', color: 'var(--on-background)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>App Language</h1>
      </div>

      <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--outline-variant)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--primary)', marginBottom: '16px' }}>
          language
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--on-surface)' }}>
          English Supported
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>
          Full app translation is being prepared. English is currently the supported interface language for the Tourist Guardian prototype.
        </p>
      </div>
      
      <p style={{ marginTop: '24px', fontSize: 14, color: 'var(--on-surface-variant)' }}>
        Note: If you need to translate conversations with locals, please use the <strong>Live Voice Translator</strong> tool in the settings menu.
      </p>
    </div>
  );
}
