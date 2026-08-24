/**
 * Geo-Fence Engine
 * 
 * Calculates distances using Haversine formula and maintains a registry of
 * safety zones.
 */

// Haversine formula to calculate distance in meters
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Configured real-world safety zones across our supported cities
export const SAFETY_ZONES = [
  // Shillong Zones
  { id: 'zone-shi-001', name: 'Mawlai Border Region', type: 'DANGER', latitude: 25.5898, longitude: 91.8988, radiusMeters: 500, description: 'Historically prone to unrest at night.' },
  { id: 'zone-shi-002', name: 'Police Bazar Night Market', type: 'CAUTION', latitude: 25.5788, longitude: 91.8933, radiusMeters: 300, description: 'High density, caution for pickpocketing.' },
  
  // Mumbai Zones
  { id: 'zone-mum-001', name: 'Dharavi Slum Interiors', type: 'CAUTION', latitude: 19.0380, longitude: 72.8538, radiusMeters: 800, description: 'Dense, easy to get lost.' },
  { id: 'zone-mum-002', name: 'Kurla West Isolated Rails', type: 'DANGER', latitude: 19.0664, longitude: 72.8795, radiusMeters: 400, description: 'High crime rate reported after hours.' },
  
  // Delhi Zones
  { id: 'zone-del-001', name: 'Seelampur Isolated Corridors', type: 'DANGER', latitude: 28.6657, longitude: 77.2657, radiusMeters: 600, description: 'Not recommended for tourists alone.' },
  { id: 'zone-del-002', name: 'Old Delhi Crowded Bazaars', type: 'CAUTION', latitude: 28.6505, longitude: 77.2303, radiusMeters: 500, description: 'Very high density, petty theft risks.' },

  // Bengaluru Zones
  { id: 'zone-blr-001', name: 'KR Market Density', type: 'CAUTION', latitude: 12.9644, longitude: 77.5750, radiusMeters: 300, description: 'Extremely crowded during peak hours.' },
  { id: 'zone-blr-002', name: 'NICE Road Isolated Stretch', type: 'DANGER', latitude: 12.8535, longitude: 77.5873, radiusMeters: 1000, description: 'Isolated highway stretch, avoid stopping.' },
];

/**
 * Checks the current GPS coordinate against all configured zones.
 * Returns the highest severity zone the user is currently inside, or null if SAFE.
 * Includes dynamic TEST ZONES if one was created.
 */
export function checkCurrentZone(lat, lon, customTestZone = null) {
  let activeZones = [...SAFETY_ZONES];
  if (customTestZone) {
    activeZones.push(customTestZone);
  }

  let currentDanger = null;
  let currentCaution = null;

  for (const zone of activeZones) {
    const distance = calculateDistance(lat, lon, zone.latitude, zone.longitude);
    if (distance <= zone.radiusMeters) {
      if (zone.type === 'DANGER' && !currentDanger) {
        currentDanger = { ...zone, distanceToZone: distance };
      } else if (zone.type === 'CAUTION' && !currentCaution) {
        currentCaution = { ...zone, distanceToZone: distance };
      }
    }
  }

  // Danger overrides Caution
  return currentDanger || currentCaution || null;
}

/**
 * Helper to dynamically create a test zone around the user's physical GPS
 * so the system can be tested dynamically on real devices.
 */
export function createDynamicTestZone(lat, lon, type = 'DANGER', radius = 100) {
  return {
    id: `test-zone-${Date.now()}`,
    name: `Test ${type} Zone`,
    type: type,
    latitude: lat,
    longitude: lon,
    radiusMeters: radius,
    description: 'Dynamic testing zone.'
  };
}
