import { useNavigate } from 'react-router-dom';

export default function LanguageRegion() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/tourist/menu')} 
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Language & Region</h1>
      </div>
      
      <div style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--surface-variant)', marginBottom: 'var(--space-sm)' }}>
          <span style={{ fontWeight: 500 }}>Language</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>English</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--surface-variant)', marginBottom: 'var(--space-sm)' }}>
          <span style={{ fontWeight: 500 }}>Region</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>India</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>Emergency Number</span>
          <span style={{ color: 'var(--error)', fontWeight: 700 }}>112</span>
        </div>
      </div>
    </div>
  );
}
