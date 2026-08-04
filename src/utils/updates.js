import { storage } from "./storage";
import { STORAGE_KEYS } from "./storage";

export function normaliseVersion(v) {
  const parts = String(v).replace(/^v/i, "").split(".");
  while (parts.length < 3) parts.push("0");
  return parts.slice(0, 3).map(Number);
}

export function semverGt(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

async function getCurrentVersion() {
  if (typeof window !== "undefined" && window.electron?.getAppVersion) {
    return window.electron.getAppVersion();
  }
  return "0.0.0";
}

export async function checkForUpdates() {
  const currentVersion = await getCurrentVersion();
  const updateUrl = storage.get(STORAGE_KEYS.UPDATE_URL);

  if (!updateUrl) {
    return {
      latest: currentVersion,
      current: currentVersion,
      url: null,
      changelog: "",
      assets: {},
      hasUpdate: false,
      skipped: true,
    };
  }

  const res = await fetch(updateUrl, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Update server error ${res.status}`);
  const data = await res.json();

  const latestRaw = (data.latest || "").replace(/^v/i, "");
  const latestParts = normaliseVersion(latestRaw);
  const currentParts = normaliseVersion(currentVersion);

  return {
    latest: latestRaw || currentVersion,
    current: currentVersion,
    url: data.url || null,
    changelog: data.changelog || "",
    assets: data.assets || {},
    hasUpdate: latestRaw !== "" && semverGt(latestParts, currentParts),
    skipped: false,
  };
}
