import { Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import './TouristLayout.css';

export default function TouristLayout() {
  return (
    <div className="tourist-layout">
      <div className="tourist-layout-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
