const fs = require('fs');
const path = require('path');
const https = require('https');

const OFFLINE_REGIONS = {
  mumbai: { bounds: { minLat: 18.89, maxLat: 19.30, minLon: 72.75, maxLon: 73.00 } },
  delhi: { bounds: { minLat: 28.40, maxLat: 28.88, minLon: 76.84, maxLon: 77.34 } },
  bengaluru: { bounds: { minLat: 12.80, maxLat: 13.15, minLon: 77.45, maxLon: 77.75 } },
  shillong: { bounds: { minLat: 25.50, maxLat: 25.65, minLon: 91.80, maxLon: 92.00 } },
  guwahati: { bounds: { minLat: 26.10, maxLat: 26.25, minLon: 91.65, maxLon: 91.85 } }
};

const ZOOM_LEVELS = [11, 12, 13];
const OUTPUT_DIR = path.join(__dirname, '../public/offline-maps-data');

function lon2tile(lon, zoom) {
  return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

function lat2tile(lat, zoom) {
  return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

async function downloadTile(z, x, y, cityId) {
  const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const tileDir = path.join(OUTPUT_DIR, cityId, `${z}`, `${x}`);
  const tilePath = path.join(tileDir, `${y}.png`);

  if (fs.existsSync(tilePath)) {
    return; // Already downloaded
  }

  fs.mkdirSync(tileDir, { recursive: true });

  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TouristGuardian Prototype Developer Script' } }, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Failed to download ${url}: ${res.statusCode}`);
        res.resume();
        return resolve(); // Resolve anyway to continue
      }
      const stream = fs.createWriteStream(tilePath);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
      stream.on('error', (err) => {
        fs.unlink(tilePath, () => {});
        resolve();
      });
    }).on('error', (err) => resolve());
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allTiles = [];

  for (const [cityId, region] of Object.entries(OFFLINE_REGIONS)) {
    let tileCount = 0;
    const tileList = [];

    for (const z of ZOOM_LEVELS) {
      const minX = lon2tile(region.bounds.minLon, z);
      const maxX = lon2tile(region.bounds.maxLon, z);
      const minY = lat2tile(region.bounds.maxLat, z);
      const maxY = lat2tile(region.bounds.minLat, z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= Math.max(minY, maxY); y++) {
          allTiles.push({ z, x, y, cityId });
          tileList.push(`${z}/${x}/${y}`);
          tileCount++;
        }
      }
    }
    
    // Save a manifest for the city
    fs.writeFileSync(path.join(OUTPUT_DIR, `${cityId}_manifest.json`), JSON.stringify({
      cityId,
      tileCount,
      tiles: tileList
    }));
    console.log(`${cityId} requires ${tileCount} tiles.`);
  }

  console.log(`Downloading a total of ${allTiles.length} tiles...`);

  const CHUNK_SIZE = 5; // Be polite to OSM
  for (let i = 0; i < allTiles.length; i += CHUNK_SIZE) {
    const chunk = allTiles.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(t => downloadTile(t.z, t.x, t.y, t.cityId)));
    if (i % 50 === 0) {
      console.log(`Progress: ${i}/${allTiles.length}`);
    }
    // Small delay to prevent rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Download complete!');
}

main().catch(console.error);
