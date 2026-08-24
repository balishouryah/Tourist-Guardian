import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../../../utils/ThemeContext';

export default function AppSettings() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState({
    liveTracking: true,
    notifications: true,
    locationSharing: true,
    aiDetection: true,
    offlineMode: true
  });

  const toggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

  const { theme, setTheme } = useTheme();

  const settings = [
    { key: 'liveTracking', label: 'Live Safety Tracking', desc: 'Monitor your journey progress.' },
    { key: 'notifications', label: 'Safety Notifications', desc: 'Receive alerts for high-risk zones.' },
    { key: 'locationSharing', label: 'Location Sharing', desc: 'Share location during an SOS event.' },
    { key: 'aiDetection', label: 'AI Safety Detection', desc: 'Enable contextual risk analysis.' },
    { key: 'offlineMode', label: 'Offline Safety Mode', desc: 'Cache maps and safety baselines.' }
  ];

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
        <button 
          onClick={() => navigate('/tourist/menu')} 
          style={{ background: 'none', border: 'none', padding: 0, marginRight: 'var(--space-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>App Settings</h1>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {settings.map(setting => (
          <div key={setting.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ flex: 1, marginRight: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{setting.label}</div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{setting.desc}</div>
            </div>
            <div 
              onClick={() => toggle(setting.key)}
              style={{ width: 44, height: 24, borderRadius: 12, background: toggles[setting.key] ? 'var(--primary)' : 'var(--outline-variant)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--on-primary)', position: 'absolute', top: 2, left: toggles[setting.key] ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        ))}

        <div style={{ padding: 'var(--space-md)', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', marginTop: 'var(--space-md)' }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Appearance</div>
          <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 12 }}>Choose the app theme.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['light', 'dark'].map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t)}
                className={theme === t ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ flex: 1, padding: '8px 0', textTransform: 'capitalize' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
