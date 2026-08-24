/**
 * geoUtils.js
 * Utility functions for AR Safety View geographic calculations.
 */

// Converts numeric degrees to radians
function toRad(Value) {
  return Value * Math.PI / 180;
}

// Converts radians to numeric degrees
function toDeg(Value) {
  return Value * 180 / Math.PI;
}

/**
 * Calculates the Haversine distance between two coordinates in meters.
 * @param {number} lat1 - Point 1 Latitude
 * @param {number} lon1 - Point 1 Longitude
 * @param {number} lat2 - Point 2 Latitude
 * @param {number} lon2 - Point 2 Longitude
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Calculates the initial bearing from Point 1 to Point 2 in degrees.
 * @param {number} lat1 - Point 1 Latitude
 * @param {number} lon1 - Point 1 Longitude
 * @param {number} lat2 - Point 2 Latitude
 * @param {number} lon2 - Point 2 Longitude
 * @returns {number} Bearing in degrees (0 to 360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lon1);
  const λ2 = toRad(lon2);

  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  
  return (toDeg(θ) + 360) % 360;
}
