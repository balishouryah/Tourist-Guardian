/**
 * Prototype AI Risk Engine
 * 
 * This module calculates a transparent safety score based on simulated
 * situational context. It is an explainable heuristic model designed
 * for the hackathon presentation.
 */

export function calculateRisk({ deviationKm, inactivityMinutes, inHighRiskZone, inCautionZone, baseAreaRisk = 0 }) {
  let score = 100 - baseAreaRisk;
  let signals = [];
  
  if (baseAreaRisk > 0) {
    signals.push(`Regional Baseline Risk (-${baseAreaRisk})`);
  }

  // Route Deviation Penalty
  if (deviationKm > 1.0) {
    score -= 25;
    signals.push(`Route deviation (${deviationKm} km)`);
  } else if (deviationKm > 0.5) {
    score -= 10;
    signals.push(`Minor deviation (${deviationKm} km)`);
  }

  // Prolonged Inactivity Penalty
  if (inactivityMinutes > 30) {
    score -= 30;
    signals.push(`Prolonged inactivity (${inactivityMinutes} min)`);
  } else if (inactivityMinutes > 15) {
    score -= 15;
    signals.push(`Unusual stoppage (${inactivityMinutes} min)`);
  }

  // Zone Penalty
  if (inHighRiskZone) {
    score -= 20;
    signals.push('Entered high-risk zone');
  } else if (inCautionZone) {
    score -= 10;
    signals.push('Entered caution zone');
  }

  // Ensure score stays bounded
  score = Math.max(0, Math.min(100, score));

  // Determine Severity Level
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
