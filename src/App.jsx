import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import TouristLayout from './tourist/TouristLayout';
import AuthorityLayout from './authority/AuthorityLayout';

// Tourist screens
import Welcome from './tourist/screens/Welcome';
import Dashboard from './tourist/screens/Dashboard';
import CreateProfile from './tourist/screens/CreateProfile';
import PlanJourney from './tourist/screens/PlanJourney';
import LiveSafetyMap from './tourist/screens/LiveSafetyMap';
import AISafetyAlert from './tourist/screens/AISafetyAlert';
import AreaSafetyWarning from './tourist/screens/AreaSafetyWarning';
import SOSMode from './tourist/screens/SOSMode';
import SafetyCredential from './tourist/screens/SafetyCredential';
import OfflineMode from './tourist/screens/OfflineMode';
import Alerts from './tourist/screens/Alerts';
import Menu from './tourist/screens/Menu';

// Authority screens
import CommandCenter from './authority/screens/CommandCenter';
import AIRiskCenter from './authority/screens/AIRiskCenter';
import IncidentDetail from './authority/screens/IncidentDetail';
import RiskIntelligence from './authority/screens/RiskIntelligence';
import AuthorityMap from './authority/screens/AuthorityMap';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Welcome — no layout wrapper (full-screen) */}
        <Route path="/" element={<Welcome />} />

        {/* Tourist experience — mobile-first layout */}
        <Route path="/tourist" element={<TouristLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<CreateProfile />} />
          <Route path="journey" element={<PlanJourney />} />
          <Route path="map" element={<LiveSafetyMap />} />
          <Route path="alert" element={<AISafetyAlert />} />
          <Route path="area-warning" element={<AreaSafetyWarning />} />
          <Route path="sos" element={<SOSMode />} />
          <Route path="credential" element={<SafetyCredential />} />
          <Route path="offline" element={<OfflineMode />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="menu" element={<Menu />} />
        </Route>

        {/* Authority experience — desktop-first layout */}
        <Route path="/authority" element={<AuthorityLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CommandCenter />} />
          <Route path="risk-center" element={<AIRiskCenter />} />
          <Route path="incident/:id" element={<IncidentDetail />} />
          <Route path="intelligence" element={<RiskIntelligence />} />
          <Route path="map" element={<AuthorityMap />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
