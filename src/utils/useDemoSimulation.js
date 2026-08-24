/**
 * useDemoSimulation — Stage 5 Risk Engine Simulation
 * 
 * Instead of hardcoding scores, this hook provides realistic context
 * (deviation, inactivity, zones) to the risk engine.
 */

import { useState, useCallback } from 'react';
import { useSharedDemoState } from './useSharedDemoState';

const RISK_STAGES = [
  {
    key: 'START',
    label: 'Journey Started',
    context: { deviationKm: 0, inactivityMinutes: 0, inHighRiskZone: false, inCautionZone: false, baseAreaRisk: 13 }
  },
  {
    key: 'DEVIATING',
    label: 'Minor Deviation',
    context: { deviationKm: 0.8, inactivityMinutes: 5, inHighRiskZone: false, inCautionZone: true, baseAreaRisk: 13 }
  },
  {
    key: 'STOPPED',
    label: 'Unusual Stoppage',
    context: { deviationKm: 0.8, inactivityMinutes: 16, inHighRiskZone: false, inCautionZone: true, baseAreaRisk: 13 }
  },
  {
    key: 'HIGH_RISK',
    label: 'Entered High Risk Area',
    context: { deviationKm: 1.1, inactivityMinutes: 20, inHighRiskZone: true, inCautionZone: false, baseAreaRisk: 13 }
  },
  {
    key: 'CRITICAL',
    label: 'Prolonged Inactivity (Distress)',
    context: { deviationKm: 1.4, inactivityMinutes: 32, inHighRiskZone: true, inCautionZone: false, baseAreaRisk: 13 }
  }
];

export function useDemoSimulation() {
  const [stageIndex, setStageIndex] = useState(0);
  const { updateRiskContext } = useSharedDemoState();

  const applyStage = useCallback((index) => {
    const stage = RISK_STAGES[index];
    if (stage) {
      updateRiskContext(stage.context);
    }
  }, [updateRiskContext]);

  const advanceSimulation = useCallback(() => {
    setStageIndex((prev) => {
      const next = Math.min(prev + 1, RISK_STAGES.length - 1);
      applyStage(next);
      return next;
    });
  }, [applyStage]);

  const resetSimulation = useCallback(() => {
    setStageIndex(0);
  }, []);

  return {
    stageIndex,
    currentStage: RISK_STAGES[stageIndex],
    advanceSimulation,
    resetSimulation,
    isComplete: stageIndex >= RISK_STAGES.length - 1
  };
}
