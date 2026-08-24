import { useNavigate } from 'react-router-dom';
import { useAccessibility } from '../../../utils/AccessibilityContext';

export default function Accessibility() {
  const navigate = useNavigate();
  const { settings: toggles, toggleSetting: toggle } = useAccessibility();

  const settings = [
    { key: 'largeText', label: 'Large Text', desc: 'Increase text size across the app.' },
    { key: 'highContrast', label: 'High Contrast', desc: 'Improve readability with high contrast.' },
    { key: 'reduceMotion', label: 'Reduce Motion', desc: 'Minimize UI animations.' },
    { key: 'screenReader', label: 'Screen Reader Support', desc: 'Optimize for screen readers.' }
  ];

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/tourist/menu')} 
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Accessibility</h1>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {settings.map(setting => (
          <div key={setting.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'white', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ flex: 1, marginRight: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{setting.label}</div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{setting.desc}</div>
            </div>
            <div 
              onClick={() => toggle(setting.key)}
              style={{ width: 44, height: 24, borderRadius: 12, background: toggles[setting.key] ? 'var(--primary)' : '#e5e7eb', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: 'white', position: 'absolute', top: 2, left: toggles[setting.key] ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
