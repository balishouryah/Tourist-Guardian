import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';

export default function Menu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const menuGroups = [
    {
      title: 'SECURITY & SAFETY',
      items: [
        { icon: 'id_card', label: 'KYC & Digital Identity', description: 'Verify your identity', path: '/tourist/settings/kyc' },
        { icon: 'contacts', label: 'Emergency Contacts', description: 'People to contact in an emergency', path: '/tourist/settings/emergency' },
        { icon: 'person', label: 'My Profile', description: 'Your tourist information', path: '/tourist/profile' },
        { icon: 'offline_bolt', label: 'Offline Safety', description: 'Prepare for low-connectivity areas', path: '/tourist/offline' },
        { icon: 'view_in_ar', label: 'AR Safety View', description: 'Explore your surroundings', path: '/tourist/ar' },
      ]
    },
    {
      title: 'LANGUAGE & COMMUNICATION',
      items: [
        { icon: 'language', label: 'App Language', description: 'Choose your interface', path: '/tourist/settings/language' },
        { icon: 'translate', label: 'Live Voice Translator', description: 'Translate conversations', path: '/tourist/settings/translator' },
      ]
    },
    {
      title: 'APPEARANCE & ACCESSIBILITY',
      items: [
        { icon: 'accessibility_new', label: 'Accessibility', description: 'Text, contrast & motion', path: '/tourist/settings/accessibility' },
        { icon: 'palette', label: 'Appearance', description: 'Theme and display', path: '/tourist/settings/privacy' }, // Reusing privacy path as placeholder for now, or just keeping it
      ]
    },
    {
      title: 'OTHER',
      items: [
        { icon: 'security', label: 'Privacy & Data', description: 'Manage your data', path: '/tourist/settings/privacy' },
        { icon: 'help', label: 'Help & Support', description: 'Get assistance', path: '/tourist/settings/help' },
      ]
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{ flex: 1, padding: 'var(--space-lg)', paddingBottom: '100px' }} className="animate-fade-in">
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 'var(--space-md) 0 var(--space-xl)' }}>Settings</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {group.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--outline-variant)' }}>
              {group.items.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(item.path)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '16px', 
                    borderBottom: i < group.items.length - 1 ? '1px solid var(--outline-variant)' : 'none', 
                    cursor: 'pointer',
                    background: 'var(--surface)'
                  }}>
                  <div style={{ 
                    width: '40px', height: '40px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-container)', 
                    color: 'var(--on-primary-container)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '16px'
                  }}>
                    <span className="material-symbols-outlined">{item.icon}</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--on-surface)' }}>{item.label}</span>
                    {item.description && (
                      <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: '2px' }}>{item.description}</span>
                    )}
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div 
          onClick={handleLogout}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            padding: '16px', background: 'var(--error-container)', color: 'var(--on-error-container)', 
            borderRadius: 'var(--radius-lg)', cursor: 'pointer', marginTop: 'var(--space-md)' 
          }}>
          <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>logout</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{user ? 'Log Out' : 'Exit Demo Mode'}</span>
        </div>
      </div>
      
      <p style={{ marginTop: 'var(--space-2xl)', textAlign: 'center', fontSize: 13, color: 'var(--on-surface-variant)', opacity: 0.6 }}>
        Tourist Guardian Prototype<br/>
        Version 1.4.0
      </p>
    </div>
  );
}
