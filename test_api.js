const POI_CATEGORIES = {
  hospital: { query: '["amenity"="hospital"]' },
  police: { query: '["amenity"="police"]' },
  pharmacy: { query: '["amenity"="pharmacy"]' },
  fire_station: { query: '["amenity"="fire_station"]' },
  restaurant: { query: '["amenity"~"restaurant|fast_food|cafe"]' },
  grocery: { query: '["shop"~"supermarket|convenience|grocery"]' },
  hotel: { query: '["tourism"="hotel"]' },
  transport: { query: '["highway"="bus_stop"]' } // also can add public_transport
};
console.log(POI_CATEGORIES);
