const MAX_LOGS = 100;
const logs = [];

export function pushError(source, message, detail) {
  logs.unshift({
    time: new Date().toISOString(),
    source,
    message,
    detail: detail ? String(detail) : "",
  });
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
  try {
    console.error(`[SINEX_ERR] ${source}: ${message}`, detail || "");
    const tauri = window.__TAURI__;
    if (tauri?.core?.invoke) {
      tauri.core.invoke("log_error", { source, message, detail: detail || "" });
    }
  } catch {}
}

export function getErrorLogs() {
  return logs;
}

export function clearErrorLogs() {
  logs.length = 0;
}

export function formatErrorLogs() {
  return logs
    .map(
      (e, i) =>
        `[${i + 1}] ${e.time} | ${e.source}\n${e.message}${e.detail ? "\n" + e.detail : ""}`,
    )
    .join("\n\n");
}
