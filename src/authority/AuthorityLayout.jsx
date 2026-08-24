import { Outlet } from 'react-router-dom';
import AuthorityNav from '../components/AuthorityNav';
import IncidentToast from './components/IncidentToast';
import { AuthorityRealtimeProvider } from './utils/AuthorityRealtimeContext';
import './AuthorityLayout.css';

export default function AuthorityLayout() {
  return (
    <AuthorityRealtimeProvider>
      <div className="authority-layout">
        <AuthorityNav />
        <div className="authority-layout-content">
          <Outlet />
        </div>
        <IncidentToast />
      </div>
    </AuthorityRealtimeProvider>
  );
}
