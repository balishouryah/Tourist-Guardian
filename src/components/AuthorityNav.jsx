import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthorityAuth } from '../authority/utils/AuthorityAuthContext';
import './AuthorityNav.css';

const links = [
  { path: '/authority/dashboard',    label: 'Dashboard' },
  { path: '/authority/efirs',        label: 'E-FIRs' },
  { path: '/authority/risk-center',  label: 'AI Risk' },
  { path: '/authority/kyc',          label: 'KYC Center' },
  { path: '/authority/map',          label: 'Live Map' },
  { path: '/authority/tourists',     label: 'Tourist Directory' },
];

export default function AuthorityNav() {
  const { logout, authorityProfile } = useAuthorityAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/authority/login', { replace: true });
  };

  return (
    <nav className="authority-nav" aria-label="Authority navigation">
      <NavLink to="/authority/dashboard" className="authority-nav-brand">
        Tourist Guardian
      </NavLink>

      <div className="authority-nav-links">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `authority-nav-link${isActive ? ' active' : ''}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="authority-nav-actions">
        {/* System status icon - now just an indicator */}
        <div className="authority-nav-icon-btn" aria-label="System status" style={{ cursor: 'default' }}>
          <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--safe)' }}>verified_user</span>
        </div>

        {/* Profile / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="authority-nav-avatar" aria-label="User profile" title={authorityProfile?.display_name || 'Operator'}>
            {authorityProfile?.display_name ? authorityProfile.display_name.charAt(0) : 'OC'}
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={handleLogout}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
