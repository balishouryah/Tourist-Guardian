/**
 * Upgraded Explainable Safety Engine
 * 
 * Deterministic scoring model for Phase 3 Geo-Fencing & Safety Intelligence.
 * Base score is 100. Deductions are mapped to explicit signals.
 */

export function calculateLiveRisk({ 
  currentZone, 
  behaviorSignals = [], 
  questionnaire = null,
  isSOSActive = false,
  isHelpActive = false,
  hasGpsDropout = false
}) {
  let score = 100;
  let signals = [];
  
  // 1. Zone Deductions
  if (currentZone) {
    if (currentZone.type === 'DANGER') {
      score -= 30;
      signals.push(`Entered high-risk zone: ${currentZone.name} (-30)`);
    } else if (currentZone.type === 'CAUTION') {
      score -= 15;
      signals.push(`Entered caution zone: ${currentZone.name} (-15)`);
    }
  }

  // 2. Behavioral Signals (From behaviorAnalysisService)
  behaviorSignals.forEach(signal => {
    if (signal.type === 'PROLONGED_INACTIVITY') {
      score -= 15;
      signals.push(`Prolonged inactivity (${signal.minutes} min) (-15)`);
    } else if (signal.type === 'ROUTE_DEVIATION') {
      if (signal.severity === 'SIGNIFICANT') {
        score -= 20;
        signals.push(`Significant route deviation (-20)`);
      } else {
        score -= 10;
        signals.push(`Minor route deviation (-10)`);
      }
    }
  });

  // 3. GPS Dropout
  if (hasGpsDropout) {
    score -= 10;
    signals.push(`GPS connection lost (-10)`);
  }

  // 4. Questionnaire Deductions
  if (questionnaire) {
    if (questionnaire.immediateDanger || questionnaire.threatened) {
      score = 0;
      signals.push('Reported immediate danger/threat (Critical override)');
    } else {
      if (questionnaire.unsafe) {
        score -= 25;
        signals.push('Reported feeling unsafe (-25)');
      }
      if (questionnaire.lost) {
        score -= 15;
        signals.push('Reported being lost (-15)');
      }
      if (questionnaire.noTransport) {
        score -= 10;
        signals.push('Reported lack of transport (-10)');
      }
      if (questionnaire.lowBattery) {
        score -= 5;
        signals.push('Reported low battery (-5)');
      }
    }
  }

  // 5. Active Incidents (Overrides/Deductions)
  if (isHelpActive) {
    score -= 30;
    signals.push('Requested non-emergency help (-30)');
  }

  if (isSOSActive) {
    score = 0;
    signals.push('SOS ACTIVATED (Critical override)');
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
 * 
 * This module calculates a transparent safety score based on simulated
 * situational context.
 */
export function calculateRisk({ deviationKm, inactivityMinutes, inHighRiskZone, inCautionZone, baseAreaRisk = 0 }) {
  let score = 100 - baseAreaRisk;
  let signals = [];
  
  if (baseAreaRisk > 0) {
    signals.push(`Regional Baseline Risk (-${baseAreaRisk})`);
  }

  if (deviationKm > 1.0) {
    score -= 25;
    signals.push(`Route deviation (${deviationKm} km)`);
  } else if (deviationKm > 0.5) {
    score -= 10;
    signals.push(`Minor deviation (${deviationKm} km)`);
  }

  if (inactivityMinutes > 30) {
    score -= 30;
    signals.push(`Prolonged inactivity (${inactivityMinutes} min)`);
  } else if (inactivityMinutes > 15) {
    score -= 15;
    signals.push(`Unusual stoppage (${inactivityMinutes} min)`);
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
    severity = 'MEDIUM';
  }

  return {
    score,
    severity,
    signals,
    isDistress: score < 40
  };
}
