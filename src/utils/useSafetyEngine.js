import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLiveLocation } from './LocationContext';
import { useOfflineStatus } from './useOfflineStatus';
import { checkCurrentZone, createDynamicTestZone } from '../services/geofenceEngine';
import { BehaviorAnalysisEngine } from '../services/behaviorAnalysisService';
import { calculateLiveRisk } from './riskEngine';
import { logSafetyEvent } from '../services/safetyEventService';
import { updateLiveSafetyState } from '../services/touristService';

const behaviorEngine = new BehaviorAnalysisEngine();

export function useSafetyEngine() {
  const { touristProfile } = useAuth();
  const { currentLoc, isDemoMode } = useLiveLocation();
  const { isOnline } = useOfflineStatus();

  const [testZone, setTestZone] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null); // Will be populated from IndexedDB later
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isHelpActive, setIsHelpActive] = useState(false);

  const [safetyState, setSafetyState] = useState({
    score: 100,
    severity: 'SAFE',
    signals: [],
    currentZone: null
  });

  const lastZoneId = useRef(null);
  const lastScore = useRef(100);

  // Expose a way to create a dynamic test zone
  const createTestZone = (radius = 100) => {
    if (currentLoc.latitude && currentLoc.longitude) {
      const zone = createDynamicTestZone(currentLoc.latitude, currentLoc.longitude, 'DANGER', radius);
      setTestZone(zone);
    }
  };
  
  const clearTestZone = () => setTestZone(null);

  const submitQuestionnaire = async (answers) => {
    // Determine a hypothetical score just for logging if needed, or simply log the event immediately
    const severity = answers.immediateDanger || answers.threatened ? 'CRITICAL' 
                   : answers.unsafe || answers.lost ? 'HIGH' 
                   : 'CAUTION';
                   
    const risk_score = severity === 'CRITICAL' ? 0 : severity === 'HIGH' ? 40 : 70;

    logSafetyEvent(touristProfile.auth_user_id, {
      event_type: 'QUESTIONNAIRE',
      severity,
      latitude: currentLoc.latitude || 0,
      longitude: currentLoc.longitude || 0,
      zone_id: activeZoneRef.current?.id || null, // We'll need a ref for active zone if we want it here
      risk_score,
      detected_signals: ['Submitted Safety Questionnaire']
    }, isOnline);

    if (isOnline) {
      updateLiveSafetyState(risk_score, severity);
    }

    setQuestionnaire(answers); // This will trigger the main effect to re-evaluate the overall risk
  };

  // We need to keep a ref to activeZone so submitQuestionnaire can access it without being in the dependency array
  const activeZoneRef = useRef(null);

  useEffect(() => {
    // We do NOT run the live safety engine if we are in demo mode or missing auth/location
    if (isDemoMode || !touristProfile || !currentLoc.latitude) return;

    const lat = currentLoc.latitude;
    const lon = currentLoc.longitude;

    // 1. Check Zones
    const activeZone = checkCurrentZone(lat, lon, testZone);
    activeZoneRef.current = activeZone;

    // 2. Process Behavioral Anomalies
    const behaviorSignals = behaviorEngine.processLocation(lat, lon, currentLoc.accuracy, currentLoc.timestamp);
    const dropoutSignal = behaviorEngine.checkDropout();
    const hasDropout = !!dropoutSignal;

    // 3. Calculate Risk
    const newRisk = calculateLiveRisk({
      currentZone: activeZone,
      behaviorSignals,
      questionnaire,
      isSOSActive,
      isHelpActive,
      hasGpsDropout: hasDropout
    });

    // 4. Update State
    setSafetyState({
      score: newRisk.score,
      severity: newRisk.severity,
      signals: newRisk.signals,
      currentZone: activeZone
    });

    // 5. Trigger Alerts & Log Events (only when state changes significantly)
    const currentZoneId = activeZone ? activeZone.id : null;
    
    // Zone Entry & Exit Events
    if (currentZoneId !== lastZoneId.current) {
      if (lastZoneId.current) {
        // Exited previous zone
        logSafetyEvent(touristProfile.auth_user_id, {
          event_type: 'ZONE_EXIT',
          severity: 'SAFE',
          latitude: lat,
          longitude: lon,
          zone_id: lastZoneId.current,
          risk_score: newRisk.score,
          detected_signals: ['Exited Zone']
        }, isOnline);
      }
      
      if (activeZone) {
        // Entered new zone
        logSafetyEvent(touristProfile.auth_user_id, {
          event_type: 'ZONE_ENTRY',
          severity: newRisk.severity,
          latitude: lat,
          longitude: lon,
          zone_id: activeZone.id,
          risk_score: newRisk.score,
          detected_signals: newRisk.signals
        }, isOnline);
      }
      lastZoneId.current = currentZoneId;
    }

    // Significant Score Change Event (e.g., drops by more than 10 points or is critical)
    if (Math.abs(lastScore.current - newRisk.score) >= 10 || newRisk.severity === 'CRITICAL') {
      logSafetyEvent(touristProfile.auth_user_id, {
        event_type: 'SCORE_CHANGE',
        severity: newRisk.severity,
        latitude: lat,
        longitude: lon,
        zone_id: currentZoneId,
        risk_score: newRisk.score,
        detected_signals: newRisk.signals
      }, isOnline);
      
      if (isOnline) {
        updateLiveSafetyState(newRisk.score, newRisk.severity);
      }
      
      lastScore.current = newRisk.score;
    }

  }, [currentLoc, isDemoMode, touristProfile, isOnline, testZone, questionnaire, isSOSActive, isHelpActive]);

  return {
    ...safetyState,
    testZone,
    createTestZone,
    clearTestZone,
    submitQuestionnaire,
    setQuestionnaire,
    setIsSOSActive,
    setIsHelpActive
  };
}
