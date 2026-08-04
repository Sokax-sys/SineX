fetch("http://localhost:5173/tmdb-api/configuration", {
  headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0ODhiYTY3NzUwMmUzODQ3YmVmYTJkZjc0ZmQ1YTNmNCIsIm5iZiI6MTc3OTQ0MDM5Ny41ODA5OTk5LCJzdWIiOiI2YTEwMWIwZDhlZmM4MmE3MDlhMzQ4NjAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.iKKyEvTXs0KNi-rCkaXQf3OYr38h-iu7_DZBdGU616M" },
})
  .then((r) => {
    console.log("STATUS:", r.status);
    return r.text();
  })
  .then((t) => console.log("BODY:", t.slice(0, 500)))
  .catch((e) => console.log("ERR:", e.message));
