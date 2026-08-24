import { useState, useEffect, useCallback } from 'react';
import { subscribe, broadcast, EventTypes } from './eventBus';
import { calculateRisk } from './riskEngine';
import { createIncident, updateIncidentStatus } from '../services/incidentService';



const INITIAL_STATE = {
  active: false,
  id: 'TG-1042',
  touristId: 'TG-IND-88291',
  touristName: 'Aarav Sharma',
  location: 'Shillong City Center',
  severity: 'SAFE',
  status: 'SAFE',
  score: 87,
  signals: ['Regional Baseline Risk (-13)'],
  timeline: [],
};

export function useSharedDemoState() {
  // We use localStorage as a simple initial state persistence across tabs
  const [incident, setIncident] = useState(() => {
    try {
      const stored = localStorage.getItem('demo_incident_state');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored incident state', e);
    }
    return INITIAL_STATE;
  });

  // Whenever incident state changes locally, update localStorage
  useEffect(() => {
    localStorage.setItem('demo_incident_state', JSON.stringify(incident));
  }, [incident]);

  const addTimelineEvent = useCallback((eventStr, severityStr) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return { time: timeStr, event: eventStr, severity: severityStr };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      const { type } = event;

      setIncident((prev) => {
        let next = { ...prev };

        switch (type) {
          case EventTypes.AI_DISTRESS_DETECTED:
            next.active = true;
            next.status = 'POSSIBLE DISTRESS';
            next.severity = 'CRITICAL';
            next.timeline = [...prev.timeline, addTimelineEvent('AI distress detected', 'high')];
            break;

          case EventTypes.TOURIST_SAFE:
            next.status = 'SAFE';
            next.severity = 'SAFE'; // Visual mapping
            next.timeline = [...prev.timeline, addTimelineEvent('Tourist reported safe', 'safe')];
            break;

          case EventTypes.TOURIST_NEEDS_HELP:
            next.status = 'NEEDS ASSISTANCE';
            next.severity = 'HIGH';
            next.timeline = [...prev.timeline, addTimelineEvent('Tourist requested non-emergency help', 'high')];
            break;

          case EventTypes.SOS_ACTIVATED:
            next.active = true;
            next.status = 'SOS ACTIVATED';
            next.severity = 'CRITICAL';
            next.timeline = [...prev.timeline, addTimelineEvent('SOS activated by tourist', 'critical')];
            break;

          case EventTypes.INCIDENT_ACKNOWLEDGED:
            next.timeline = [...prev.timeline, addTimelineEvent('Authority acknowledged incident', 'info')];
            break;

          case EventTypes.INCIDENT_ESCALATED:
            next.severity = 'CRITICAL';
            next.status = 'ESCALATED';
            next.timeline = [...prev.timeline, addTimelineEvent('Authority escalation initiated', 'critical')];
            break;

          case EventTypes.INCIDENT_RESOLVED:
            next.active = false;
            next.status = 'RESOLVED';
            next.severity = 'SAFE';
            next.timeline = [...prev.timeline, addTimelineEvent('Incident resolved', 'safe')];
            break;

          case EventTypes.DEMO_RESET:
            return { ...INITIAL_STATE };

          default:
            break;
        }

        return next;
      });
    });

    return () => unsubscribe();
  }, [addTimelineEvent]);

  // Provide explicit trigger functions for the UI components
  const triggerDistress = useCallback(async () => {
    broadcast(EventTypes.AI_DISTRESS_DETECTED);
    const { data } = await createIncident({
      incidentType: 'AI_DISTRESS',
      severity: 'CRITICAL',
      riskScore: incident.score,
      signals: incident.signals,
      // For the demo, we fallback to Shillong coords if geolocation isn't cached
      latitude: window.tgLastLat || 25.5788,
      longitude: window.tgLastLng || 91.8933,
    });
    if (data && !data.duplicate) setIncident(prev => ({ ...prev, backendIncidentId: data.id }));
  }, [incident.score, incident.signals]);

  const markSafe = async () => {
    broadcast(EventTypes.TOURIST_SAFE);
    if (incident.backendIncidentId) {
      await updateIncidentStatus(incident.backendIncidentId, 'CANCELLED');
      setIncident(prev => ({ ...prev, backendIncidentId: null }));
    }
  };

  const needHelp = async () => {
    broadcast(EventTypes.TOURIST_NEEDS_HELP);
    const { data } = await createIncident({
      incidentType: 'NEED_HELP',
      severity: 'HIGH',
      riskScore: incident.score,
      signals: incident.signals,
      latitude: window.tgLastLat || 25.5788,
      longitude: window.tgLastLng || 91.8933,
    });
    if (data && !data.duplicate) setIncident(prev => ({ ...prev, backendIncidentId: data.id }));
  };

  const activateSOS = async (providedLat, providedLng) => {
    broadcast(EventTypes.SOS_ACTIVATED);
    
    // Use explicitly provided live location, or fallback to cached/demo location
    let lat = providedLat ?? window.tgLastLat ?? 25.5788;
    let lng = providedLng ?? window.tgLastLng ?? 91.8933;

    const { data, error } = await createIncident({
      incidentType: 'SOS',
      severity: 'CRITICAL',
      riskScore: incident.score,
      signals: incident.signals,
      latitude: lat,
      longitude: lng,
    });

    if (error) {
      console.warn('[Demo Fallback] Backend incident creation failed, using BroadcastChannel exclusively.', error);
    } else if (data && !data.duplicate) {
      setIncident(prev => ({ ...prev, backendIncidentId: data.id }));
    }
  };

  const acknowledgeIncident = () => broadcast(EventTypes.INCIDENT_ACKNOWLEDGED);
  const escalateIncident = () => broadcast(EventTypes.INCIDENT_ESCALATED);
  const resolveIncident = () => broadcast(EventTypes.INCIDENT_RESOLVED);
  const resetDemo = () => broadcast(EventTypes.DEMO_RESET);

  // New: Stage 5 Risk Engine Integration
  const updateRiskContext = useCallback((context) => {
    // Only update if the incident hasn't been manually resolved/overridden
    if (incident.status === 'SAFE' || incident.status === 'RESOLVED') return;
    
    // Do NOT update risk score or severity if an emergency is actively ongoing.
    // The state must remain locked to CRITICAL / 24 or whatever it was set to.
    if (incident.active) return;

    const { score, severity, signals, isDistress } = calculateRisk(context);

    setIncident(prev => {
      return {
        ...prev,
        score,
        severity,
        signals
      };
    });

    // Automatically trigger distress if threshold crossed and not already active
    if (isDistress && !incident.active && incident.status !== 'SAFE') {
      triggerDistress();
    }
  }, [incident.status, incident.active, triggerDistress]);

  return {
    incident,
    triggerDistress,
    markSafe,
    needHelp,
    activateSOS,
    acknowledgeIncident,
    escalateIncident,
    resolveIncident,
    resetDemo,
    updateRiskContext,
  };
}
