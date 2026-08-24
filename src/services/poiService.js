/**
 * poiService.js
 * 
 * Handles fetching Points of Interest (POIs) using OpenStreetMap's Overpass API.
 * Uses a memory cache to avoid spamming the free API and handles distances via Haversine.
 */

import { saveOfflineData, getOfflineData } from './offlineService';

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// Simple memory cache: key -> data
// A more robust implementation might use IndexedDB, but memory is fine for a single session.
const poiCache = new Map();

// Map our categories to OSM Overpass node types
export const POI_CATEGORIES = {
  // EMERGENCY
  hospital: { label: 'Hospitals', type: 'emergency', icon: 'local_hospital', markerColor: 'red', query: '["amenity"="hospital"]' },
  police: { label: 'Nearest Police Stations', type: 'emergency', icon: 'local_police', markerColor: 'blue', query: '["amenity"="police"]' },
  pharmacy: { label: 'Pharmacies', type: 'emergency', icon: 'local_pharmacy', markerColor: 'violet', query: '["amenity"="pharmacy"]' },
  fire_station: { label: 'Fire Stations', type: 'emergency', icon: 'fire_truck', markerColor: 'orange', query: '["amenity"="fire_station"]' },
  // ESSENTIALS
  restaurant: { label: 'Food', type: 'everyday', icon: 'restaurant', markerColor: 'yellow', query: '["amenity"~"restaurant|fast_food|cafe"]' },
  grocery: { label: 'Groceries', type: 'everyday', icon: 'local_grocery_store', markerColor: 'green', query: '["shop"~"supermarket|convenience|grocery"]' },
  hotel: { label: 'Hotels', type: 'everyday', icon: 'hotel', markerColor: 'grey', query: '["tourism"="hotel"]' },
  transport: { label: 'Transport', type: 'everyday', icon: 'directions_bus', markerColor: 'black', query: '["highway"="bus_stop"]' }
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetches POIs from Overpass API
 * @param {string} categoryKey - Key from POI_CATEGORIES
 * @param {number} lat - Current latitude
 * @param {number} lon - Current longitude
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} - Array of parsed POI objects sorted by distance
 */
export async function searchNearbyPOIs(categoryKey, lat, lon, radius = 5000) {
  const category = POI_CATEGORIES[categoryKey];
  if (!category) throw new Error('Invalid POI category');

  // Create a cache key rounded to ~100 meters (3 decimal places) to allow minor movement without refetching
  const latRounded = lat.toFixed(3);
  const lonRounded = lon.toFixed(3);
  const cacheKey = `${categoryKey}_${latRounded}_${lonRounded}_${radius}`;

  if (poiCache.has(cacheKey)) {
    console.log(`[POI] Using memory cache for ${cacheKey}`);
    return poiCache.get(cacheKey);
  }

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  if (!isOnline) {
    const offlineCache = await getOfflineData('global_pois', cacheKey);
    if (offlineCache) {
      console.log(`[POI] Using offline IndexedDB cache for ${cacheKey}`);
      // Hydrate memory cache
      poiCache.set(cacheKey, offlineCache);
      return offlineCache;
    }
    throw new Error('OFFLINE');
  }

  console.log(`[POI] Fetching ${categoryKey} around ${lat},${lon} (radius ${radius}m)...`);

  // Overpass QL to find nodes/ways/relations around a coordinate
  const query = `
    [out:json][timeout:25];
    (
      node${category.query}(around:${radius},${lat},${lon});
      way${category.query}(around:${radius},${lat},${lon});
      relation${category.query}(around:${radius},${lat},${lon});
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error('RATE_LIMIT');
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse and normalize results
    const results = (data.elements || []).map(element => {
      // For ways/relations, the coordinates are in 'center', for nodes they are direct
      const poiLat = element.lat || (element.center && element.center.lat);
      const poiLon = element.lon || (element.center && element.center.lon);
      const tags = element.tags || {};
      
      const distance = calculateDistance(lat, lon, poiLat, poiLon);
      
      return {
        id: `${element.type}_${element.id}`,
        name: tags.name || tags.brand || 'Unknown Name',
        category: categoryKey,
        distance, // in km
        lat: poiLat,
        lon: poiLon,
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || null,
        phone: tags.phone || tags['contact:phone'] || null,
        opening_hours: tags.opening_hours || null
      };
    });

    // Sort by nearest
    results.sort((a, b) => a.distance - b.distance);

    // Cache the results for this session (store only top 50 to save memory)
    const topResults = results.slice(0, 50);
    poiCache.set(cacheKey, topResults);
    
    // Save to IndexedDB for offline usage
    await saveOfflineData('global_pois', cacheKey, topResults);
    
    // Prevent memory cache from growing indefinitely
    if (poiCache.size > 20) {
      const firstKey = poiCache.keys().next().value;
      poiCache.delete(firstKey);
    }

    return topResults;
  } catch (error) {
    console.error('[POI] Fetch error:', error);
    throw error;
  }
}
