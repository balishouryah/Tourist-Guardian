import { Outlet } from 'react-router-dom';
import AuthorityNav from '../components/AuthorityNav';
import './AuthorityLayout.css';

export default function AuthorityLayout() {
  return (
    <div className="authority-layout">
      <AuthorityNav />
      <div className="authority-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
