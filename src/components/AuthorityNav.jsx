import { NavLink } from 'react-router-dom';
import './AuthorityNav.css';

const links = [
  { path: '/authority/dashboard',    label: 'Dashboard' },
  { path: '/authority/map',          label: 'Map' },
  { path: '/authority/risk-center',  label: 'Analytics' },
  { path: '/authority/intelligence', label: 'Incidents' },
];

export default function AuthorityNav() {
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
        {/* Notification bell with red dot */}
        <button className="authority-nav-icon-btn" aria-label="Notifications">
          <span className="material-symbols-outlined">notifications</span>
          <span className="authority-nav-notification-dot" />
        </button>

        {/* Shield / system status icon */}
        <button className="authority-nav-icon-btn" aria-label="System status">
          <span className="material-symbols-outlined icon-filled">shield</span>
        </button>

        {/* Avatar */}
        <div className="authority-nav-avatar" aria-label="User profile">
          OC
        </div>
      </div>
    </nav>
  );
}
