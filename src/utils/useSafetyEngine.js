import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLiveLocation } from './LocationContext';
import { useOfflineStatus } from './useOfflineStatus';
import { checkCurrentZone, createDynamicTestZone } from '../services/geofenceEngine';
import { BehaviorAnalysisEngine } from '../services/behaviorAnalysisService';
import { calculateLiveRisk } from './riskEngine';
import { logSafetyEvent } from '../services/safetyEventService';
import { updateLiveSafetyState } from '../services/touristService';

export function useSafetyEngine() {
  const { touristProfile } = useAuth();
  const { currentLoc, isDemoMode } = useLiveLocation();
  const { isOnline } = useOfflineStatus();

  // 1. Isolate the BehaviorAnalysisEngine per hook instance (per tourist session)
  const behaviorEngineRef = useRef(new BehaviorAnalysisEngine());

  const [testZone, setTestZone] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null); 
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isHelpActive, setIsHelpActive] = useState(false);

  const [safetyState, setSafetyState] = useState({
    score: 100,
    severity: 'SAFE',
    signals: [],
    currentZone: null
  });

  const lastZoneId = useRef(null);
  
  // Initialize lastScore to null to force a push on the very first evaluation
  const lastScore = useRef(null);
  const lastSeverity = useRef(null);
  const lastSignals = useRef(null);

  // Expose a way to create a dynamic test zone
  const createTestZone = (radius = 100) => {
    if (currentLoc.latitude && currentLoc.longitude) {
      const zone = createDynamicTestZone(currentLoc.latitude, currentLoc.longitude, 'DANGER', radius);
      setTestZone(zone);
    }
  };
  
  const clearTestZone = () => setTestZone(null);

  // DEV-ONLY mechanism to manually reset the active safety session state to 100/SAFE
  // without deleting historical SOS or GPS data.
  const resetSafetyState = async () => {
    setSafetyState({
      score: 100,
      severity: 'SAFE',
      signals: [],
      currentZone: null
    });
    lastScore.current = 100;
    lastSeverity.current = 'SAFE';
    lastSignals.current = [];
    lastZoneId.current = null;
    clearTestZone();
    if (isOnline && touristProfile?.auth_user_id) {
      await updateLiveSafetyState(100, 'SAFE', []);
    }
  };

  const submitQuestionnaire = async (answers) => {
    // Determine a hypothetical score just for logging if needed
    const severity = answers.immediateDanger || answers.threatened ? 'CRITICAL' 
                   : answers.unsafe || answers.lost ? 'HIGH' 
                   : 'CAUTION';
                   
    const risk_score = severity === 'CRITICAL' ? 0 : severity === 'HIGH' ? 40 : 70;

    logSafetyEvent(touristProfile.auth_user_id, {
      event_type: 'QUESTIONNAIRE',
      severity,
      latitude: currentLoc.latitude || 0,
      longitude: currentLoc.longitude || 0,
      zone_id: activeZoneRef.current?.id || null, 
      risk_score,
      detected_signals: ['Submitted Safety Questionnaire']
    }, isOnline);

    if (isOnline) {
      updateLiveSafetyState(risk_score, severity, ['Submitted Safety Questionnaire']);
    }

    setQuestionnaire(answers); // This will trigger the main effect to re-evaluate the overall risk
  };

  const activeZoneRef = useRef(null);

  useEffect(() => {
    // We do NOT run the live safety engine if we are in demo mode or missing auth/location
    if (isDemoMode || !touristProfile || !currentLoc.latitude) return;

    const lat = currentLoc.latitude;
    const lon = currentLoc.longitude;

    // 1. Check Zones
    const activeZone = checkCurrentZone(lat, lon, testZone);
    activeZoneRef.current = activeZone;

    // 2. Process Behavioral Anomalies via isolated engine
    const engine = behaviorEngineRef.current;
    const behaviorSignals = engine.processLocation(lat, lon, currentLoc.accuracy, currentLoc.timestamp);
    const dropoutSignal = engine.checkDropout();
    const hasDropout = !!dropoutSignal;

    // 3. Calculate Risk
    const newRisk = calculateLiveRisk({
      currentZone: activeZone,
      behaviorSignals,
      questionnaire,
      isSOSActive,
      isHelpActive,
      hasGpsDropout: hasDropout,
      dropoutDetails: dropoutSignal
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
          severity: 'SAFE', // Safely resetting context
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

    // Push to DB if score changes significantly, severity changes, signals change, or initialization
    const signalsChanged = JSON.stringify(lastSignals.current) !== JSON.stringify(newRisk.signals);
    const severityChanged = lastSeverity.current !== newRisk.severity;
    
    if (lastScore.current === null || Math.abs(lastScore.current - newRisk.score) >= 10 || severityChanged || signalsChanged) {
      
      // Only log a SCORE_CHANGE event if this isn't just the initial sync 
      // of a 100/SAFE score. We don't want to spam history on every login.
      if (lastScore.current !== null || newRisk.score < 100) {
        logSafetyEvent(touristProfile.auth_user_id, {
          event_type: 'SCORE_CHANGE',
          severity: newRisk.severity,
          latitude: lat,
          longitude: lon,
          zone_id: currentZoneId,
          risk_score: newRisk.score,
          detected_signals: newRisk.signals
        }, isOnline);
      }
      
      if (isOnline) {
        // Sync the current session's fresh safety state to the database,
        // clearing out any stale/persisted penalties from past sessions
        // unless they are still actively violating a rule (e.g. still in danger zone)
        updateLiveSafetyState(newRisk.score, newRisk.severity, newRisk.signals);
      }
      
      lastScore.current = newRisk.score;
      lastSeverity.current = newRisk.severity;
      lastSignals.current = newRisk.signals;
    }

  }, [currentLoc, isDemoMode, touristProfile, isOnline, testZone, questionnaire, isSOSActive, isHelpActive]);

  return {
    ...safetyState,
    testZone,
    createTestZone,
    clearTestZone,
    resetSafetyState,
    submitQuestionnaire,
    setQuestionnaire,
    setIsSOSActive,
    setIsHelpActive
  };
}
