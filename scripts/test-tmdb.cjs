// Test TMDB connectivity using different methods
const https = require("https");
const dns = require("dns");

// Method 1: direct https.get
console.log("=== Method 1: https.get ===");
const req1 = https.get("https://api.themoviedb.org/3/configuration", {
  headers: { "User-Agent": "SineX/2.4" },
}, (res) => {
  let d = "";
  res.on("data", (c) => d += c);
  res.on("end", () => console.log("OK:", res.statusCode, d.slice(0, 200)));
});
req1.on("error", (e) => console.log("FAIL:", e.message, e.code));
req1.setTimeout(10000, () => { console.log("TIMEOUT"); req1.destroy(); });

// Method 2: resolve IP first, then connect
setTimeout(() => {
  dns.resolve4("api.themoviedb.org", (err, addrs) => {
    if (err) return console.log("DNS FAIL:", err.message);
    console.log("IPs:", addrs);
    const ip = addrs[0];
    console.log(`=== Method 2: https.get to ${ip} ===`);
    const opts = {
      hostname: ip,
      port: 443,
      path: "/3/configuration",
      headers: { "User-Agent": "SineX/2.4", Host: "api.themoviedb.org" },
      rejectUnauthorized: false,
    };
    const req2 = https.get(opts, (res) => {
      let d = "";
      res.on("data", (c) => d += c);
      res.on("end", () => console.log("OK:", res.statusCode, d.slice(0, 200)));
    });
    req2.on("error", (e) => console.log("FAIL:", e.message, e.code));
    req2.setTimeout(10000, () => { console.log("TIMEOUT"); req2.destroy(); });
  });
}, 2000);
