const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const port = 9900;
const logFile = path.join(__dirname, "..", "error-log.txt");
const TMDB_HOST = "api.themoviedb.org";

const logs = [];
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function proxyTmdb(req, res) {
  const tmdbPath = req.url.replace("/tmdb", "");
  const url = `https://${TMDB_HOST}/3${tmdbPath}`;
  console.log(`Proxying: ${url}`);
  try {
    // Use curl.exe via PowerShell (Node.js undici/fetch has TLS issues with TMDB on this machine)
    const curl = `${process.env.SystemRoot}\\System32\\curl.exe`;
    const escUrl = url.replace(/'/g, "''").replace(/&/g, "'+'&'+'");
    const cmd = `powershell -NoLogo -NoProfile -Command "& '${curl}' -s -w ''"'+'"+'`n%{http_code}"'+'"+'' ''${escUrl}''"`;
    const resp = execSync(cmd, { timeout: 20000, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    const lastNewline = resp.lastIndexOf("\n");
    const body = resp.slice(0, lastNewline).trim();
    const statusCode = parseInt(resp.slice(lastNewline + 1).trim(), 10) || 502;
    res.writeHead(statusCode, CORS_HEADERS);
    res.end(body);
  } catch (e) {
    const detail = e.message || String(e);
    console.error("Proxy error:", detail, "URL:", url);
    res.writeHead(502, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: detail }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  if (req.url.startsWith("/tmdb")) {
    return proxyTmdb(req, res);
  }
  if (req.method === "POST" && req.url === "/log") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let data;
      try { data = JSON.parse(body); } catch { data = { source: "raw", message: body, detail: "", time: new Date().toISOString() }; }
      const line = `[${data.time || new Date().toISOString()}] ${data.source}: ${data.message}${data.detail ? " | " + data.detail : ""}`;
      logs.push(line);
      fs.appendFileSync(logFile, line + "\n");
      console.log(line);
    });
    res.writeHead(200, CORS_HEADERS);
    res.end("ok");
  } else if (req.method === "GET" && (req.url === "/logs" || req.url === "/")) {
    res.writeHead(200, CORS_HEADERS);
    res.end(logs.join("\n") || "(no errors)");
  } else {
    res.writeHead(200, CORS_HEADERS);
    res.end("error-server");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Dev server listening on port ${port}`);
  console.log(`TMDB proxy: http://localhost:${port}/tmdb/...`);
});
