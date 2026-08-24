import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OFFLINE_REGIONS = {
  mumbai: { bounds: { minLat: 18.89, maxLat: 19.30, minLon: 72.75, maxLon: 73.00 }, zoom: 12 },
  delhi: { bounds: { minLat: 28.40, maxLat: 28.88, minLon: 76.84, maxLon: 77.34 }, zoom: 11 },
  bengaluru: { bounds: { minLat: 12.80, maxLat: 13.15, minLon: 77.45, maxLon: 77.75 }, zoom: 12 },
  shillong: { bounds: { minLat: 25.50, maxLat: 25.65, minLon: 91.80, maxLon: 92.00 }, zoom: 13 }
};

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

async function fetchTile(z, x, y) {
  const url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TouristGuardianHackathon/1.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    return await Jimp.read(Buffer.from(buffer));
  } catch (err) {
    console.error(`Failed to fetch tile ${z}/${x}/${y}:`, err.message);
    return new Jimp({ width: 256, height: 256, color: 0xe0e0e0ff }); // Grey fallback
  }
}

async function stitchMap(cityId, config) {
  const { bounds, zoom } = config;
  const xMin = lon2tile(bounds.minLon, zoom);
  const xMax = lon2tile(bounds.maxLon, zoom);
  const yMin = lat2tile(bounds.maxLat, zoom); // Max lat = smaller Y (North)
  const yMax = lat2tile(bounds.minLat, zoom); // Min lat = larger Y (South)

  const cols = xMax - xMin + 1;
  const rows = yMax - yMin + 1;
  const width = cols * 256;
  const height = rows * 256;

  console.log(`[${cityId}] Stitching ${cols}x${rows} tiles for zoom ${zoom} (${width}x${height}px)`);

  const image = new Jimp({ width, height });

  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      const tile = await fetchTile(zoom, x, y);
      const px = (x - xMin) * 256;
      const py = (y - yMin) * 256;
      image.composite(tile, px, py);
      
      // Delay slightly to respect OSM rate limits
      await new Promise(r => setTimeout(r, 100));
    }
  }

  const outDir = path.join(process.cwd(), 'public', 'offline-maps');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${cityId}.png`);
  await image.write(outPath);
  console.log(`[${cityId}] Saved static map to ${outPath}`);

  // Calculate pixel-to-coord mapping bounds
  // The bounding box of the image corresponds EXACTLY to the bounding box of the selected tiles
  function tile2lon(x, z) {
    return x / Math.pow(2, z) * 360 - 180;
  }
  function tile2lat(y, z) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  const actualMinLon = tile2lon(xMin, zoom);
  const actualMaxLon = tile2lon(xMax + 1, zoom);
  const actualMaxLat = tile2lat(yMin, zoom); // North edge
  const actualMinLat = tile2lat(yMax + 1, zoom); // South edge

  const meta = {
    id: cityId,
    width,
    height,
    bounds: {
      minLat: actualMinLat,
      maxLat: actualMaxLat,
      minLon: actualMinLon,
      maxLon: actualMaxLon
    }
  };

  const metaPath = path.join(outDir, `${cityId}.meta.json`);
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
}

async function main() {
  for (const [cityId, config] of Object.entries(OFFLINE_REGIONS)) {
    await stitchMap(cityId, config);
  }
}

main().catch(console.error);
