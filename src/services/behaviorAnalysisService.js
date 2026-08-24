import { calculateDistance } from './geofenceEngine';

/**
 * Deterministic Behavioral Analysis Service
 * 
 * Processes a stream of GPS locations and detects behavioral anomalies:
 * - PROLONGED_INACTIVITY
 * - GPS_DROPOUT
 * - ROUTE_DEVIATION
 * - GPS_ANOMALY (Impossible location jumps)
 */

const INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const DROPOUT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SIGNIFICANT_MOVEMENT_METERS = 50; // Must move 50m to reset inactivity
const MINOR_DEVIATION_METERS = 500;
const SIGNIFICANT_DEVIATION_METERS = 1000;
const IMPOSSIBLE_SPEED_MS = 150; // 150 meters per second (~540 km/h) - filters bad GPS

export class BehaviorAnalysisEngine {
  constructor() {
    this.lastKnownLocation = null;
    this.lastMeaningfulMovementTime = Date.now();
    this.expectedRoute = null; // Array of {latitude, longitude} waypoints
  }

  setExpectedRoute(waypoints) {
    this.expectedRoute = waypoints;
  }

  // Called periodically (e.g. every 1-5 minutes) when GPS is lost
  checkDropout() {
    if (!this.lastKnownLocation) return null;
    
    const timeSinceUpdate = Date.now() - this.lastKnownLocation.timestamp;
    if (timeSinceUpdate > DROPOUT_THRESHOLD_MS) {
      return { type: 'GPS_DROPOUT', durationMs: timeSinceUpdate, minutes: Math.round(timeSinceUpdate / 60000) };
    }
    return null;
  }

  // Called whenever a new GPS location is received
  processLocation(lat, lon, accuracy, timestamp = Date.now()) {
    const signals = [];
    
    // Safety check for impossible speeds (GPS_ANOMALY)
    if (this.lastKnownLocation) {
      const dist = calculateDistance(
        this.lastKnownLocation.latitude, 
        this.lastKnownLocation.longitude, 
        lat, 
        lon
      );
      
      const timeDiffS = (timestamp - this.lastKnownLocation.timestamp) / 1000;
      
      if (timeDiffS > 0) {
        const speedMs = dist / timeDiffS;
        
        // If speed is impossibly high, flag an anomaly and reject this point as "last known location"
        if (speedMs > IMPOSSIBLE_SPEED_MS && dist > 1000) {
          signals.push({
            type: 'GPS_ANOMALY',
            speedMs: Math.round(speedMs),
            distanceKm: (dist / 1000).toFixed(1)
          });
          // Return early so we don't trigger false route deviations or update the last known valid spot
          return signals;
        }
      }

      // 1. Inactivity Check (Valid Movement)
      if (dist > SIGNIFICANT_MOVEMENT_METERS) {
        this.lastMeaningfulMovementTime = timestamp;
      } else {
        const timeIdle = timestamp - this.lastMeaningfulMovementTime;
        if (timeIdle > INACTIVITY_THRESHOLD_MS) {
          signals.push({ 
            type: 'PROLONGED_INACTIVITY', 
            durationMs: timeIdle,
            minutes: Math.round(timeIdle / 60000)
          });
        }
      }
    }

    // 2. Route Deviation Check
    if (this.expectedRoute && this.expectedRoute.length > 0) {
      let minDistanceToRoute = Infinity;
      
      for (const waypoint of this.expectedRoute) {
        const dist = calculateDistance(lat, lon, waypoint.latitude, waypoint.longitude);
        if (dist < minDistanceToRoute) {
          minDistanceToRoute = dist;
        }
      }

      if (minDistanceToRoute > SIGNIFICANT_DEVIATION_METERS) {
        signals.push({ 
          type: 'ROUTE_DEVIATION', 
          severity: 'SIGNIFICANT',
          deviationMeters: Math.round(minDistanceToRoute),
          deviationKm: (minDistanceToRoute / 1000).toFixed(1)
        });
      } else if (minDistanceToRoute > MINOR_DEVIATION_METERS) {
        signals.push({ 
          type: 'ROUTE_DEVIATION', 
          severity: 'MINOR',
          deviationMeters: Math.round(minDistanceToRoute),
          deviationKm: (minDistanceToRoute / 1000).toFixed(1)
        });
      }
    }

    // Update state
    this.lastKnownLocation = { latitude: lat, longitude: lon, accuracy, timestamp };

    return signals;
  }
}
