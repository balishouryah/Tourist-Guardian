// Vercel Serverless Function to proxy Overpass API requests
// This resolves CORS and IP rate-limiting issues when running from Vercel.

export const config = {
  runtime: 'edge', // Using edge runtime for faster execution and node fetch
};

const POI_CATEGORIES = {
  hospital: '["amenity"="hospital"]',
  police: '["amenity"="police"]',
  pharmacy: '["amenity"="pharmacy"]',
  fire_station: '["amenity"="fire_station"]',
  restaurant: '["amenity"~"restaurant|fast_food|cafe"]',
  grocery: '["shop"~"supermarket|convenience|grocery"]',
  hotel: '["tourism"="hotel"]',
  transport: '["highway"="bus_stop"]'
};

const PROVIDERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

export default async function handler(req) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // Use a dummy base for parsing relative URLs when running in local middleware
  const url = new URL(req.url, 'http://localhost');
  const lat = parseFloat(url.searchParams.get('lat'));
  const lng = parseFloat(url.searchParams.get('lng'));
  const radius = parseInt(url.searchParams.get('radius')) || 5000;
  const category = url.searchParams.get('category');

  if (isNaN(lat) || isNaN(lng) || !category || !POI_CATEGORIES[category]) {
    return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
  }

  const catQuery = POI_CATEGORIES[category];
  
  // Overpass QL query
  const query = `
    [out:json][timeout:15];
    (
      node${catQuery}(around:${radius},${lat},${lng});
      way${catQuery}(around:${radius},${lat},${lng});
      relation${catQuery}(around:${radius},${lat},${lng});
    );
    out center;
  `;
  
  const bodyData = `data=${encodeURIComponent(query)}`;

  let lastError = null;

  for (const provider of PROVIDERS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout per provider
      
      const response = await fetch(provider, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TouristGuardianApp/1.0 (Contact: admin@touristguardian.com)',
          'Accept': 'application/json'
        },
        body: bodyData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 's-maxage=60, stale-while-revalidate=120'
          }
        });
      } else {
        lastError = `Provider ${provider} failed with status ${response.status}`;
        console.warn(`[API] ${lastError}`);
      }
    } catch (error) {
      lastError = `Provider ${provider} fetch error: ${error.name === 'AbortError' ? 'Timeout' : error.message}`;
      console.warn(`[API] ${lastError}`);
    }
  }

  // If all providers failed
  return new Response(JSON.stringify({ error: 'All Overpass providers failed', details: lastError }), { 
    status: 502,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
