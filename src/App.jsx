import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { AuthorityAuthProvider, useAuthorityAuth } from './authority/utils/AuthorityAuthContext';
import { LocationProvider } from './utils/LocationContext';
import { SafetyProvider } from './utils/SafetyContext';
import { ThemeProvider } from './utils/ThemeContext';
import { LanguageProvider } from './utils/LanguageContext';
import { AccessibilityProvider } from './utils/AccessibilityContext';
import { NotificationProvider } from './utils/NotificationContext';
import { useEffect } from 'react';
import { testSupabaseConnection } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

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
import OfflineMapView from './tourist/screens/OfflineMapView';
import Alerts from './tourist/screens/Alerts';
import Menu from './tourist/screens/Menu';
import ARSafetyView from './tourist/screens/ARSafetyView';
import EmergencyContacts from './tourist/screens/EmergencyContacts';
import NearbyServices from './tourist/screens/NearbyServices';
import SafetyCheck from './tourist/screens/SafetyCheck';

// Tourist Settings screens
import AppSettings from './tourist/screens/settings/AppSettings';
import LanguageRegion from './tourist/screens/settings/LanguageRegion';
import Accessibility from './tourist/screens/settings/Accessibility';
import PrivacyData from './tourist/screens/settings/PrivacyData';
import HelpSupport from './tourist/screens/settings/HelpSupport';
import LanguageSettings from './tourist/screens/settings/LanguageSettings';
import LiveVoiceTranslator from './tourist/screens/settings/LiveVoiceTranslator';
import KYCVerification from './tourist/screens/KYCVerification';
import FamilyTracking from './tourist/screens/settings/FamilyTracking';

// Family Viewer
import FamilyView from './family/FamilyView';
import FamilyInvite from './family/FamilyInvite';

// Authority screens
import CommandCenter from './authority/screens/CommandCenter';
import AIRiskCenter from './authority/screens/AIRiskCenter';
import AuthorityKYCCenter from './authority/screens/AuthorityKYCCenter';
import IncidentDetail from './authority/screens/IncidentDetail';
import RiskIntelligence from './authority/screens/RiskIntelligence';
import AuthorityMap from './authority/screens/AuthorityMap';
import AuthorityEFIRCenter from './authority/screens/AuthorityEFIRCenter';
import EFIRDetail from './authority/screens/EFIRDetail';
import AuthorityTourists from './authority/screens/AuthorityTourists';

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
      <AccessibilityProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <AuthorityAuthProvider>
                <BrowserRouter>
            <Routes>
              {/* Welcome — no layout wrapper (full-screen) */}
              <Route path="/" element={<Welcome />} />
              
              <Route path="/tourist/login" element={<Login />} />
              <Route path="/tourist/onboarding" element={<CreateProfile />} />

              {/* Family tracking viewer & invite */}
              <Route path="/family/track/:token" element={<FamilyView />} />
              <Route path="/family/invite/:token" element={<FamilyInvite />} />

              {/* Tourist experience — mobile-first layout */}
              <Route path="/tourist" element={
                <LocationProvider>
                  <SafetyProvider>
                    <RequireAuth>
                      <ErrorBoundary>
                        <TouristLayout />
                      </ErrorBoundary>
                    </RequireAuth>
                  </SafetyProvider>
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
                <Route path="nearby" element={<NearbyServices />} />
                <Route path="credential" element={<SafetyCredential />} />
                <Route path="offline" element={<OfflineMode />} />
                <Route path="offline-map/:city" element={<OfflineMapView />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="menu" element={<Menu />} />
                <Route path="ar" element={<ARSafetyView />} />
                <Route path="safety-check" element={<SafetyCheck />} />
                <Route path="settings/app" element={<AppSettings />} />
                <Route path="settings/language" element={<LanguageSettings />} />
                <Route path="settings/accessibility" element={<Accessibility />} />
                <Route path="settings/privacy" element={<PrivacyData />} />
                <Route path="settings/help" element={<HelpSupport />} />
                <Route path="settings/emergency" element={<EmergencyContacts />} />
                <Route path="settings/kyc" element={<KYCVerification />} />
                <Route path="settings/translator" element={<LiveVoiceTranslator />} />
                <Route path="settings/family-tracking" element={<FamilyTracking />} />
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
                <Route path="kyc" element={<AuthorityKYCCenter />} />
                <Route path="efirs" element={<AuthorityEFIRCenter />} />
                <Route path="efir/:id" element={<EFIRDetail />} />
                <Route path="tourist/:id" element={<IncidentDetail />} />
                <Route path="intelligence" element={<RiskIntelligence />} />
                <Route path="map" element={<AuthorityMap />} />
                <Route path="tourists" element={<AuthorityTourists />} />
                </Route>
              </Routes>
                </BrowserRouter>
              </AuthorityAuthProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}
