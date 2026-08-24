import { useEffect, useRef } from 'react';
import { useSharedDemoState } from '../utils/useSharedDemoState';
import { useLiveLocation } from '../utils/LocationContext';
import { updateIncidentLocation } from '../services/incidentService';

export default function IncidentLocationTracker() {
  const { incident } = useSharedDemoState();
  const { currentLoc, tracking, requestPermissionAndStart } = useLiveLocation();
  const lastUpdateRef = useRef({ time: 0, lat: null, lng: null });

  // Automatically request GPS if an SOS is activated but we aren't tracking
  useEffect(() => {
    if (incident.active && !tracking) {
      requestPermissionAndStart();
    }
  }, [incident.active, tracking, requestPermissionAndStart]);

  // Periodic/Movement updates to backend
  useEffect(() => {
    // We only track to backend if there's a real backend incident and it's active
    if (!incident.active || !incident.backendIncidentId || !currentLoc || !currentLoc.latitude || currentLoc.isDemo) {
      return;
    }

    const now = Date.now();
    const lastUpdate = lastUpdateRef.current;
    
    // Thresholds:
    // 30 seconds since last update
    const timeThresholdMet = (now - lastUpdate.time) > 30000;
    
    // Or significant movement (roughly 0.00015 degrees is ~15 meters)
    const latDiff = lastUpdate.lat ? Math.abs(currentLoc.latitude - lastUpdate.lat) : 1;
    const lngDiff = lastUpdate.lng ? Math.abs(currentLoc.longitude - lastUpdate.lng) : 1;
    const distanceThresholdMet = latDiff > 0.00015 || lngDiff > 0.00015;

    if (timeThresholdMet || distanceThresholdMet) {
      // Update backend
      updateIncidentLocation(
        incident.backendIncidentId, 
        currentLoc.latitude, 
        currentLoc.longitude, 
        currentLoc.accuracy
      ).catch(err => console.warn('Failed to update incident location', err));
      
      // Cache the update time and pos
      lastUpdateRef.current = {
        time: now,
        lat: currentLoc.latitude,
        lng: currentLoc.longitude
      };
    }
  }, [incident.active, incident.backendIncidentId, currentLoc]);

  return null; // Invisible worker component
}
