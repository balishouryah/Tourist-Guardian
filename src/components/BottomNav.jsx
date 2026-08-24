import { NavLink } from 'react-router-dom';
import { useNotifications } from '../utils/NotificationContext';
import './BottomNav.css';

const tabs = [
  { path: '/tourist/dashboard', icon: 'home',        label: 'Home' },
  { path: '/tourist/map',       icon: 'map',         label: 'Map' },
  { path: '/tourist/credential',icon: 'verified_user',label: 'Safety ID' },
  { path: '/tourist/alerts',    icon: 'notifications',label: 'Alerts' },
  { path: '/tourist/nearby',    icon: 'explore',      label: 'Nearby' },
  { path: '/tourist/menu',      icon: 'menu',         label: 'Menu' },
];

export default function BottomNav() {
  const { unreadCount } = useNotifications();

  return (
    <nav className="bottom-nav" aria-label="Tourist navigation">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
        >
          <span className="bottom-nav-icon-wrap" style={{ position: 'relative' }}>
            <span className="material-symbols-outlined icon-filled">
              {tab.icon}
            </span>
            {tab.path === '/tourist/alerts' && unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                background: 'var(--error)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 5px',
                borderRadius: '10px',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
