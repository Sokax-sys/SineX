import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import { pushError } from "./utils/errorLog";

if ("serviceWorker" in navigator && !window.__TAURI__) {
  navigator.serviceWorker.register("/sw.js");
}

window.addEventListener("error", (e) => {
  pushError("window.onerror", e.message || "Unknown error", e.filename ? `${e.filename}:${e.lineno}` : "");
});



window.addEventListener("unhandledrejection", (e) => {
  pushError("unhandledRejection", e.reason?.message || "Promise rejected", e.reason?.stack || "");
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
