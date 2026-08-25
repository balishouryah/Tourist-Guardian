async function test() {
  try {
    const res = await fetch('http://localhost:5173/api/nearby-services?lat=19.06436&lng=72.83608&category=hospital&radius=5000');
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}
test();
