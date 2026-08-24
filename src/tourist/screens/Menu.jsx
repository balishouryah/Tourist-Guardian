import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

export default function Menu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const menuItems = [
    { icon: 'view_in_ar', label: 'AR Safety View', path: '/tourist/ar' },
    { icon: 'contacts', label: 'Emergency Contacts', path: '/tourist/settings/emergency' },
    { icon: 'person', label: 'My Safety Profile', path: '/tourist/profile' },
    { icon: 'settings', label: 'App Settings', path: '/tourist/settings/app' },
    { icon: 'language', label: 'Language & Region', path: '/tourist/settings/language' },
    { icon: 'accessibility_new', label: 'Accessibility', path: '/tourist/settings/accessibility' },
    { icon: 'security', label: 'Privacy & Data', path: '/tourist/settings/privacy' },
    { icon: 'help', label: 'Help & Support', path: '/tourist/settings/help' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)' }} className="animate-fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 'var(--space-md) 0 var(--space-xl)' }}>Settings Menu</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {menuItems.map((item, i) => (
          <div 
            key={i} 
            onClick={() => navigate(item.path)}
            style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md)', background: 'white', borderRadius: 'var(--radius-md)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ marginRight: 'var(--space-md)', color: 'var(--primary)' }}>
              {item.icon}
            </span>
            <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>{item.label}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--surface-tint)' }}>chevron_right</span>
          </div>
        ))}

        <div 
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 'var(--radius-md)', cursor: 'pointer', marginTop: 'var(--space-md)' }}>
          <span className="material-symbols-outlined" style={{ marginRight: 'var(--space-md)' }}>
            logout
          </span>
          <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{user ? 'Log Out' : 'Exit Demo Mode'}</span>
        </div>
      </div>
      
      <p style={{ marginTop: 'var(--space-2xl)', textAlign: 'center', fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.7 }}>
        Tourist Guardian prototype
      </p>
    </div>
  );
}
