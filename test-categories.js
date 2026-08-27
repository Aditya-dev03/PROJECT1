const GEOAPIFY_API_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;

const categoriesToTest = [
  'catering.restaurant', 'catering.cafe', 'accommodation.hotel', 'tourism.sights',
  'entertainment.museum', 'commercial.shopping_mall', 'natural.beach', 'beach',
  'natural.sand', 'catering.pub', 'leisure.park', 'heritage', 'entertainment',
  'religion.temple', 'religion', 'commercial.marketplace', 'natural'
];

async function test() {
  for (const cat of categoriesToTest) {
    const url = `https://api.geoapify.com/v2/places?categories=${cat}&filter=circle:73.818,15.498,5000&limit=1&apiKey=${GEOAPIFY_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`❌ ${cat} failed with ${res.status}`);
    } else {
      console.log(`✅ ${cat} is valid`);
    }
  }
}
test();
