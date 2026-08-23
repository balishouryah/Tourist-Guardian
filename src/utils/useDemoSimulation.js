/**
 * useDemoSimulation — React hook for the hackathon demo simulation.
 *
 * Manages a deterministic sequence of safety events that can run:
 *   - Automatically on a timer (for polished demo)
 *   - Manually via triggerNext() (for live presentation control)
 *
 * The demo sequence:
 *   0. IDLE          — waiting to start
 *   1. JOURNEY       — safe journey, score ~92
 *   2. DEVIATION     — route deviation detected, score ~75
 *   3. INACTIVITY    — prolonged inactivity, score ~58
 *   4. HIGH_RISK     — entered high-risk zone, score ~35
 *   5. ALERT         — AI distress alert shown
 *   6. SOS           — SOS activated (or tourist responded safe)
 *   7. INCIDENT      — authority receives incident
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { broadcast, EventTypes } from './eventBus';

// The ordered list of demo stages
const DEMO_STAGES = [
  {
    key: 'IDLE',
    score: 92,
    label: 'Waiting to start',
  },
  {
    key: 'JOURNEY',
    score: 92,
    label: 'Journey started — all safe',
    event: EventTypes.JOURNEY_STARTED,
    payload: { location: 'Shillong City Center', status: 'On track' },
  },
  {
    key: 'DEVIATION',
    score: 75,
    label: 'Route deviation detected',
    event: EventTypes.ROUTE_DEVIATION,
    payload: { deviation: '1.4km off path', location: 'Near Mawphlang Forest Trail' },
  },
  {
    key: 'INACTIVITY',
    score: 58,
    label: 'Prolonged inactivity detected',
    event: EventTypes.INACTIVITY_DETECTED,
    payload: { duration: '32 min stopped', location: 'Mawphlang Sector B' },
  },
  {
    key: 'HIGH_RISK',
    score: 35,
    label: 'Entered high-risk zone',
    event: EventTypes.HIGH_RISK_ZONE_ENTRY,
    payload: { zone: 'Mawphlang Forest Trail', riskLevel: 'High' },
  },
  {
    key: 'ALERT',
    score: 24,
    label: 'AI Distress Alert triggered',
    event: EventTypes.DISTRESS_ALERT,
    payload: {
      signals: [
        { type: 'Route deviation', value: '1.4km off path' },
        { type: 'Prolonged inactivity', value: '32 min stopped' },
      ],
      riskLevel: 'Critical',
    },
  },
  {
    key: 'SOS',
    score: 10,
    label: 'SOS Activated',
    event: EventTypes.SOS_ACTIVATED,
    payload: {
      touristId: 'TG-IND-88291',
      touristName: 'Aarav Sharma',
      location: 'Mawphlang Sector B',
      coordinates: { lat: 25.4500, lng: 91.7500 },
    },
  },
  {
    key: 'INCIDENT',
    score: 10,
    label: 'Authority incident created',
    event: EventTypes.INCIDENT_CREATED,
    payload: {
      incidentId: 'INC-8924',
      touristId: 'TG-IND-88291',
      touristName: 'Aarav Sharma',
      severity: 'CRITICAL',
      location: 'Mawphlang Sector B',
      signals: ['Route deviation', 'Prolonged inactivity'],
    },
  },
];

// Default interval between auto-advance steps (ms)
const DEFAULT_INTERVAL = 8000;

export function useDemoSimulation({ autoPlay = false, interval = DEFAULT_INTERVAL } = {}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const timerRef = useRef(null);

  const currentStage = DEMO_STAGES[stageIndex];
  const isComplete = stageIndex >= DEMO_STAGES.length - 1;

  // Fire the event for the given stage index
  const fireStage = useCallback((index) => {
    const stage = DEMO_STAGES[index];
    if (!stage) return;

    // Broadcast score update
    broadcast(EventTypes.SCORE_UPDATE, { score: stage.score, stage: stage.key });

    // Broadcast the stage-specific event
    if (stage.event) {
      broadcast(stage.event, stage.payload);
    }
  }, []);

  // Advance to the next stage
  const triggerNext = useCallback(() => {
    setStageIndex((prev) => {
      const next = Math.min(prev + 1, DEMO_STAGES.length - 1);
      fireStage(next);
      return next;
    });
  }, [fireStage]);

  // Jump to a specific stage
  const jumpTo = useCallback((index) => {
    const clamped = Math.max(0, Math.min(index, DEMO_STAGES.length - 1));
    setStageIndex(clamped);
    fireStage(clamped);
  }, [fireStage]);

  // Reset to the beginning
  const reset = useCallback(() => {
    setStageIndex(0);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    broadcast(EventTypes.DEMO_RESET, {});
  }, []);

  // Start/stop auto-play
  const toggleAutoPlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (isPlaying && !isComplete) {
      timerRef.current = setInterval(() => {
        setStageIndex((prev) => {
          const next = prev + 1;
          if (next >= DEMO_STAGES.length) {
            clearInterval(timerRef.current);
            setIsPlaying(false);
            return prev;
          }
          fireStage(next);
          return next;
        });
      }, interval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isComplete, interval, fireStage]);

  return {
    // Current state
    stageIndex,
    currentStage,
    safetyScore: currentStage.score,
    isComplete,
    isPlaying,
    totalStages: DEMO_STAGES.length,
    stages: DEMO_STAGES,

    // Actions
    triggerNext,
    jumpTo,
    reset,
    toggleAutoPlay,
  };
}
