import { Outlet } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import IncidentLocationTracker from '../components/IncidentLocationTracker';
import './TouristLayout.css';

export default function TouristLayout() {
  return (
    <div className="tourist-layout">
      <IncidentLocationTracker />
      <div className="tourist-layout-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
