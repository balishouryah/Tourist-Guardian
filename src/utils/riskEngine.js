/**
 * Upgraded Explainable Safety Engine
 * 
 * Deterministic scoring model for Phase 5 AI Behavioural Intelligence.
 * Base score is 100. Deductions are mapped to explicit signals.
 */

export function calculateLiveRisk({ 
  currentZone, 
  behaviorSignals = [], 
  questionnaire = null,
  isSOSActive = false,
  isHelpActive = false,
  hasGpsDropout = false,
  dropoutDetails = null
}) {
  let score = 100;
  let signals = [];
  
  let inDangerZone = false;
  let inCautionZone = false;
  let maxInactivity = 0;

  // 1. Zone Deductions
  if (currentZone) {
    if (currentZone.type === 'DANGER') {
      inDangerZone = true;
      score -= 30;
      signals.push(`Entered high-risk zone: ${currentZone.name}`);
    } else if (currentZone.type === 'CAUTION') {
      inCautionZone = true;
      score -= 15;
      signals.push(`Entered caution zone: ${currentZone.name}`);
    }
  }

  // 2. Behavioral Signals
  behaviorSignals.forEach(signal => {
    if (signal.type === 'PROLONGED_INACTIVITY') {
      maxInactivity = Math.max(maxInactivity, signal.minutes);
      if (signal.minutes > 60) {
        score -= 45;
        signals.push(`Severe inactivity — ${signal.minutes} min`);
      } else if (signal.minutes > 30) {
        score -= 30;
        signals.push(`Prolonged inactivity — ${signal.minutes} min`);
      } else {
        score -= 15;
        signals.push(`Inactivity detected — ${signal.minutes} min`);
      }
    } else if (signal.type === 'ROUTE_DEVIATION') {
      if (signal.deviationKm >= 2.0) {
        score -= 30;
        signals.push(`Severe route deviation — ${signal.deviationKm} km`);
      } else if (signal.severity === 'SIGNIFICANT') {
        score -= 20;
        signals.push(`Significant route deviation — ${signal.deviationKm} km`);
      } else {
        score -= 10;
        signals.push(`Minor route deviation — ${signal.deviationKm} km`);
      }
    } else if (signal.type === 'GPS_ANOMALY') {
      // Anomaly doesn't deduct score on its own, it just flags bad data
      signals.push(`GPS Anomaly Detected — impossible movement (${signal.distanceKm} km jump)`);
    }
  });

  // 3. GPS Dropout
  if (hasGpsDropout) {
    const dropoutMins = dropoutDetails?.minutes || 5;
    score -= 10;
    signals.push(`GPS signal lost — > ${dropoutMins} min`);
  }

  // 4. Compound Risk Logic
  if (inDangerZone && maxInactivity > 30) {
    score -= 25; // Additional compounding penalty
    signals.push(`Compounded Risk: Danger Zone + Prolonged Inactivity`);
  }
  
  if (inDangerZone && hasGpsDropout) {
    score -= 30; // Additional compounding penalty
    signals.push(`Compounded Risk: Danger Zone + GPS Dropout`);
  }

  // 5. Questionnaire Deductions
  if (questionnaire) {
    if (questionnaire.immediateDanger || questionnaire.threatened) {
      score = 0;
      signals.push('Reported immediate danger/threat');
    } else {
      if (questionnaire.unsafe) {
        score -= 25;
        signals.push('Reported feeling unsafe');
      }
      if (questionnaire.lost) {
        score -= 15;
        signals.push('Reported being lost');
      }
      if (questionnaire.noTransport) {
        score -= 10;
        signals.push('Reported lack of transport');
      }
      if (questionnaire.lowBattery) {
        score -= 5;
        signals.push('Reported low battery');
      }
    }
  }

  // 6. Active Incidents (Overrides/Deductions)
  if (isHelpActive) {
    score -= 30;
    signals.push('Requested non-emergency help');
  }

  if (isSOSActive) {
    score = 0;
    signals.push('SOS ACTIVATED');
  }

  // Ensure score stays bounded
  score = Math.max(0, Math.min(100, score));

  // Determine Severity Level
  let severity = 'SAFE';
  if (score < 40 || isSOSActive) {
    severity = 'CRITICAL';
  } else if (score < 60) {
    severity = 'HIGH';
  } else if (score < 80) {
    severity = 'CAUTION';
  }

  return {
    score,
    severity,
    signals,
    isDistress: severity === 'CRITICAL' || severity === 'HIGH'
  };
}

/**
 * Prototype AI Risk Engine (Preserved for Demo Mode)
 */
export function calculateRisk({ deviationKm, inactivityMinutes, inHighRiskZone, inCautionZone, baseAreaRisk = 0 }) {
  let score = 100 - baseAreaRisk;
  let signals = [];
  
  if (baseAreaRisk > 0) {
    signals.push(`Regional Baseline Risk`);
  }

  if (deviationKm > 1.0) {
    score -= 25;
    signals.push(`Route deviation — ${deviationKm} km`);
  } else if (deviationKm > 0.5) {
    score -= 10;
    signals.push(`Minor deviation — ${deviationKm} km`);
  }

  if (inactivityMinutes > 30) {
    score -= 30;
    signals.push(`Prolonged inactivity — ${inactivityMinutes} min`);
  } else if (inactivityMinutes > 15) {
    score -= 15;
    signals.push(`Unusual stoppage — ${inactivityMinutes} min`);
  }

  if (inHighRiskZone) {
    score -= 20;
    signals.push('Entered high-risk zone');
  } else if (inCautionZone) {
    score -= 10;
    signals.push('Entered caution zone');
  }

  score = Math.max(0, Math.min(100, score));

  let severity = 'SAFE';
  if (score < 40) {
    severity = 'CRITICAL';
  } else if (score < 60) {
    severity = 'HIGH';
  } else if (score < 80) {
    severity = 'CAUTION'; // Fixed from MEDIUM
  }

  return {
    score,
    severity,
    signals,
    isDistress: score < 40
  };
}
