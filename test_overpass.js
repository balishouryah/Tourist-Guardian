const PROVIDERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const catQuery = '["amenity"="hospital"]';
const lat = 19.06436, lng = 72.83608, radius = 5000;
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

async function test() {
  for (const provider of PROVIDERS) {
    console.log("Trying", provider);
    try {
      const response = await fetch(provider, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TouristGuardianApp/1.0 (Contact: admin@touristguardian.com)',
          'Accept': 'application/json'
        },
        body: bodyData,
        signal: AbortSignal.timeout(8000)
      });
      console.log(response.status);
      if (response.ok) {
        console.log("SUCCESS");
        return;
      }
      console.log(await response.text());
    } catch (e) {
      console.error(e.message);
    }
  }
}
test();
