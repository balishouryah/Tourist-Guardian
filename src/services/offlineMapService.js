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

function lon2tile(lon, zoom) {
  return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

function lat2tile(lat, zoom) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

export async function downloadRegionMap(cityId, onProgress) {
  const region = OFFLINE_REGIONS[cityId];
  if (!region) throw new Error('Region not found');

  const cache = await caches.open('offline-maps');

  if (onProgress) onProgress(0, 100);

  // We will download zoom levels 11 to 14 for the bounding box.
  const zoomLevels = [11, 12, 13, 14];
  const tileUrls = [];

  for (const z of zoomLevels) {
    const minX = lon2tile(region.bounds.minLon, z);
    const maxX = lon2tile(region.bounds.maxLon, z);
    const minY = lat2tile(region.bounds.maxLat, z); // Max lat is min Y in OSM
    const maxY = lat2tile(region.bounds.minLat, z); // Min lat is max Y in OSM

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= Math.max(minY, maxY); y++) {
        // Use standard OSM subdomains a,b,c arbitrarily (or just a)
        tileUrls.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
      }
    }
  }

  // To prevent overwhelming the browser or the server, we fetch in chunks
  const chunkSize = 10;
  let completed = 0;

  for (let i = 0; i < tileUrls.length; i += chunkSize) {
    const chunk = tileUrls.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch (err) {
          console.warn('Failed to fetch tile:', url, err);
        }
      })
    );

    completed += chunk.length;
    if (onProgress) {
      onProgress(completed, tileUrls.length);
    }
  }

  // Save metadata
  const meta = {
    id: region.id,
    downloadedAt: new Date().toISOString(),
    type: 'osm_tiles',
    tileCount: tileUrls.length
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

  // We are storing tiles under a single 'offline-maps' cache.
  // We won't try to delete individual tiles to avoid complexity, 
  // but we remove the metadata so it doesn't show as downloaded.
  await clearOfflineData('global', `map_${cityId}`);
}

export async function clearAllOfflineMaps() {
  await caches.delete('offline-maps-static');
  await caches.delete('offline-maps'); // Clear the old tile cache just in case
  for (const key of Object.keys(OFFLINE_REGIONS)) {
    await clearOfflineData('global', `map_${key}`);
  }
}
