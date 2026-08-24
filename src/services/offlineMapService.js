import { saveOfflineData, getOfflineData, clearOfflineData } from './offlineService';

export const OFFLINE_REGIONS = {
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    bounds: { minLat: 18.89, maxLat: 19.30, minLon: 72.75, maxLon: 73.00 },
    estimatedMB: 12
  },
  delhi: {
    id: 'delhi',
    name: 'Delhi',
    state: 'NCR',
    bounds: { minLat: 28.40, maxLat: 28.88, minLon: 76.84, maxLon: 77.34 },
    estimatedMB: 15
  },
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    bounds: { minLat: 12.80, maxLat: 13.15, minLon: 77.45, maxLon: 77.75 },
    estimatedMB: 14
  },
  shillong: {
    id: 'shillong',
    name: 'Shillong',
    state: 'Meghalaya',
    bounds: { minLat: 25.50, maxLat: 25.65, minLon: 91.80, maxLon: 92.00 },
    estimatedMB: 4
  }
};

// Tile calculation removed as we now use static images

export async function downloadRegionMap(cityId, onProgress) {
  const region = OFFLINE_REGIONS[cityId];
  if (!region) throw new Error('Region not found');

  const cache = await caches.open('offline-maps-static');
  
  if (onProgress) onProgress(10, 100);

  const pngUrl = `/offline-maps/${cityId}.png`;
  const metaUrl = `/offline-maps/${cityId}.meta.json`;

  try {
    const [pngRes, metaRes] = await Promise.all([
      fetch(pngUrl),
      fetch(metaUrl)
    ]);

    if (!pngRes.ok || !metaRes.ok) {
      throw new Error('Failed to fetch static map assets');
    }

    await cache.put(pngUrl, pngRes.clone());
    await cache.put(metaUrl, metaRes.clone());

    if (onProgress) onProgress(100, 100);
  } catch (err) {
    console.warn(`Failed to cache static map for ${cityId}`, err);
    throw err;
  }

  // Save metadata
  const meta = {
    id: region.id,
    downloadedAt: new Date().toISOString(),
    type: 'static_image'
  };
  await saveOfflineData('global', `map_${cityId}`, meta);
  return meta;
}

export async function getDownloadedRegions() {
  const regions = [];
  for (const key of Object.keys(OFFLINE_REGIONS)) {
    const data = await getOfflineData('global', `map_${key}`);
    if (data) {
      regions.push({ ...OFFLINE_REGIONS[key], meta: data });
    }
  }
  return regions;
}

export async function removeDownloadedRegion(cityId) {
  const region = OFFLINE_REGIONS[cityId];
  if (!region) return;

  const cache = await caches.open('offline-maps-static');
  await cache.delete(`/offline-maps/${cityId}.png`);
  await cache.delete(`/offline-maps/${cityId}.meta.json`);

  await clearOfflineData('global', `map_${cityId}`);
}

export async function clearAllOfflineMaps() {
  await caches.delete('offline-maps-static');
  await caches.delete('offline-maps'); // Clear the old tile cache just in case
  for (const key of Object.keys(OFFLINE_REGIONS)) {
    await clearOfflineData('global', `map_${key}`);
  }
}
