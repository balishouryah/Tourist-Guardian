import { useEffect } from 'react';
import { useNotifications } from '../../utils/NotificationContext';
import { formatRelativeTime } from '../../utils/timeUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../utils/AuthContext';
import './Alerts.css'; // Create this CSS next

export default function Alerts() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();
  const { refreshTouristProfile, user } = useAuth();
  const navigate = useNavigate();

  // Mark all as read when opening the page
  useEffect(() => {
    if (notifications.some(n => !n.is_read)) {
      markAllAsRead();
    }
  }, [notifications, markAllAsRead]);

  if (notifications.length === 0) {
    return (
      <div className="alerts-screen empty">
        <span className="material-symbols-outlined empty-icon">
          notifications_off
        </span>
        <h2>No New Alerts</h2>
        <p>
          You're all caught up. Any AI safety alerts or verification updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="alerts-screen">
      <div className="alerts-header">
        <h2>Notifications</h2>
      </div>
      
      <div className="alerts-list">
        {notifications.map(notif => (
          <div 
            key={notif.id} 
            className={`alert-card ${!notif.is_read ? 'unread' : ''}`}
            onClick={async () => {
              if (!notif.is_read) markAsRead(notif.id);
              if (notif.type === 'KYC_APPROVED' || notif.type === 'KYC_REJECTED') {
                if (user) {
                  await refreshTouristProfile(user.id);
                }
                navigate('/tourist/settings/kyc');
              }
            }}
          >
            <div className="alert-icon-wrap">
              <span className="material-symbols-outlined">
                {notif.type === 'KYC_APPROVED' ? 'verified' : 
                 notif.type === 'KYC_REJECTED' ? 'error' : 'notifications'}
              </span>
            </div>
            <div className="alert-content">
              <h3 className="alert-title">{notif.title}</h3>
              <p className="alert-message">{notif.message}</p>
              <span className="alert-time">{formatRelativeTime(notif.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
