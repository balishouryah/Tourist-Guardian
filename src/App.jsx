import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { AuthorityAuthProvider, useAuthorityAuth } from './authority/utils/AuthorityAuthContext';
import { LocationProvider } from './utils/LocationContext';
import { ThemeProvider } from './utils/ThemeContext';
import { useEffect } from 'react';
import { testSupabaseConnection } from './lib/supabase';

// Layouts
import TouristLayout from './tourist/TouristLayout';
import AuthorityLayout from './authority/AuthorityLayout';

import AuthorityLogin from './authority/screens/AuthorityLogin';

// Tourist screens
import Welcome from './tourist/screens/Welcome';
import Login from './tourist/screens/Login';
import Dashboard from './tourist/screens/Dashboard';
import CreateProfile from './tourist/screens/CreateProfile';
import MyProfile from './tourist/screens/MyProfile';
import PlanJourney from './tourist/screens/PlanJourney';
import LiveSafetyMap from './tourist/screens/LiveSafetyMap';
import AISafetyAlert from './tourist/screens/AISafetyAlert';
import AreaSafetyWarning from './tourist/screens/AreaSafetyWarning';
import SOSMode from './tourist/screens/SOSMode';
import SafetyCredential from './tourist/screens/SafetyCredential';
import OfflineMode from './tourist/screens/OfflineMode';
import Alerts from './tourist/screens/Alerts';
import Menu from './tourist/screens/Menu';
import ARSafetyView from './tourist/screens/ARSafetyView';
import EmergencyContacts from './tourist/screens/EmergencyContacts';

// Tourist Settings screens
import AppSettings from './tourist/screens/settings/AppSettings';
import LanguageRegion from './tourist/screens/settings/LanguageRegion';
import Accessibility from './tourist/screens/settings/Accessibility';
import PrivacyData from './tourist/screens/settings/PrivacyData';
import HelpSupport from './tourist/screens/settings/HelpSupport';

// Authority screens
import CommandCenter from './authority/screens/CommandCenter';
import AIRiskCenter from './authority/screens/AIRiskCenter';
import IncidentDetail from './authority/screens/IncidentDetail';
import RiskIntelligence from './authority/screens/RiskIntelligence';
import AuthorityMap from './authority/screens/AuthorityMap';

function RequireAuth({ children }) {
  const { user, isDemoMode, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'#fff'}}>Loading...</div>;
  }

  // If we are logged in, or explicitly in demo mode, allow access.
  if (user || isDemoMode) {
    return children;
  }

  // Otherwise, redirect to login page, but save the current location they were trying to go to
  return <Navigate to="/tourist/login" state={{ from: location }} replace />;
}

function RequireAuthorityAuth({ children }) {
  const { isDemoMode } = useAuth(); // Keep checking Tourist Demo Mode for overall app state
  const { user, isAuthority, loading } = useAuthorityAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',color:'#fff'}}>Loading...</div>;
  }

  // Allow if demo mode or if they are an authenticated authority
  if (isDemoMode || (user && isAuthority)) {
    return children;
  }

  // Otherwise, redirect to authority login page
  return <Navigate to="/authority/login" state={{ from: location }} replace />;
}

export default function App() {
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthorityAuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Welcome — no layout wrapper (full-screen) */}
              <Route path="/" element={<Welcome />} />
              
              <Route path="/tourist/login" element={<Login />} />
              <Route path="/tourist/onboarding" element={<CreateProfile />} />

              {/* Tourist experience — mobile-first layout */}
              <Route path="/tourist" element={
                <LocationProvider>
                  <RequireAuth>
                    <TouristLayout />
                  </RequireAuth>
                </LocationProvider>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<MyProfile />} />
                <Route path="journey" element={<PlanJourney />} />
                <Route path="map" element={<LiveSafetyMap />} />
                <Route path="alert" element={<AISafetyAlert />} />
                <Route path="area-warning" element={<AreaSafetyWarning />} />
                <Route path="sos" element={<SOSMode />} />
                <Route path="credential" element={<SafetyCredential />} />
                <Route path="offline" element={<OfflineMode />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="menu" element={<Menu />} />
                <Route path="ar" element={<ARSafetyView />} />
                <Route path="settings/app" element={<AppSettings />} />
                <Route path="settings/language" element={<LanguageRegion />} />
                <Route path="settings/accessibility" element={<Accessibility />} />
                <Route path="settings/privacy" element={<PrivacyData />} />
                <Route path="settings/help" element={<HelpSupport />} />
                <Route path="settings/emergency" element={<EmergencyContacts />} />
              </Route>

              {/* Authority experience — desktop-first layout */}
              <Route path="/authority/login" element={<AuthorityLogin />} />
              <Route path="/authority" element={
                <RequireAuthorityAuth>
                  <AuthorityLayout />
                </RequireAuthorityAuth>
              }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<CommandCenter />} />
                <Route path="risk-center" element={<AIRiskCenter />} />
                <Route path="incident/:id" element={<IncidentDetail />} />
                <Route path="intelligence" element={<RiskIntelligence />} />
                <Route path="map" element={<AuthorityMap />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthorityAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
