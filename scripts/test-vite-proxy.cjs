// Test Vite proxy vs direct connection
const token = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ODhiYTY3NzUwMmUzODQ3YmVmYTJkZjc0ZmQ1YTNmNCIsIm5iZiI6MTc3OTQ0MDM5Ny41ODA5OTk5LCJzdWIiOiI2YTEwMWIwZDhlZmM4MmE3MDlhMzQ4NjAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.iKKyEvTXs0KNi-rCkaXQf3OYr38h-iu7_DZBdGU616M";

async function main() {
  // Direct
  console.log("=== Direct to TMDB ===");
  try {
    const r1 = await fetch("https://api.themoviedb.org/3/configuration", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("STATUS:", r1.status);
    const t1 = await r1.text();
    console.log("BODY:", t1.slice(0, 200));
  } catch (e) {
    console.log("ERR:", e.message);
  }

  // Via Vite proxy
  console.log("\n=== Via Vite proxy ===");
  try {
    const r2 = await fetch("http://localhost:5173/tmdb-api/configuration", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("STATUS:", r2.status);
    const t2 = await r2.text();
    console.log("BODY:", t2.slice(0, 200));
    console.log("ALL HEADERS:", [...r2.headers.entries()]);
  } catch (e) {
    console.log("ERR:", e.message);
  }
}

main();
