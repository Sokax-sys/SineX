import { useState, useEffect, useRef } from "react";
import {
  storage,
  STORAGE_KEYS,
  secureStorage,
  isElectron,
  clearAppCaches,
} from "../utils/storage";
import { clearTmdbCache } from "../utils/api";
import { ACCENT_PRESETS, THEME_PRESETS, applyAccentColor, applyTheme } from "../utils/appearance";

import { DEFAULT_INVIDIOUS_BASE } from "../components/TrailerModal";
import { RATING_COUNTRIES } from "../utils/ageRating";
import { WarningIcon, CelebrationIcon } from "../components/Icons";
import { checkForUpdates } from "../utils/updates";
import {
  HOME_ROWS,
  loadHomeLayout,
  loadHomeViewMode,
  saveHomeViewMode,
} from "../utils/homeLayout";
import { collectBackupData, restoreBackupData } from "../utils/backup";
import { formatBytes } from "../utils/storage";
import { useTranslate } from "../utils/i18n";
import { getErrorLogs, formatErrorLogs, clearErrorLogs } from "../utils/errorLog";

// ── Custom Select ─────────────────────────────────────────────────────────────
function SettingsSelect({ value, onChange, options, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ?? value;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block", ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 28,
          padding: "9px 14px",
          background: open ? "var(--surface3)" : "var(--surface2)",
          border: `1px solid ${open ? "var(--red)" : "var(--border)"}`,
          boxShadow: open ? "0 0 0 3px color-mix(in srgb, var(--red) 12%, transparent)" : "none",
          borderRadius: 8,
          color: "var(--text)",
          fontFamily: "var(--font-body)",
          fontSize: 14,
          cursor: "pointer",
          whiteSpace: "nowrap",
          minWidth: 0,
          transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "var(--surface3)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "var(--surface2)";
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 8 }}>
          {selectedLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text3)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 999,
            background: "var(--surface3)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            minWidth: "100%",
            maxHeight: 280,
            overflowY: "auto",
            padding: "4px",
          }}
        >
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <div
                key={o.value}
                onMouseDown={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 12px",
                  fontSize: 14,
                  borderRadius: 7,
                  cursor: "pointer",
                  color: active ? "var(--red)" : "var(--text)",
                  background: active ? "color-mix(in srgb, var(--red) 10%, transparent)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  transition: "background 0.1s, color 0.1s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>{o.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Start page config ─────────────────────────────────────────────────────────

// Age limit options: null = none, or specific ages
const getAgeLimitOptions = (t) => [
  { value: "", label: t("settings.noRestriction") },
  { value: "0", label: t("settings.ageOption0") },
  { value: "7", label: t("settings.ageOption7") },
  { value: "12", label: t("settings.ageOption12") },
  { value: "13", label: t("settings.ageOption13") },
  { value: "15", label: t("settings.ageOption15") },
  { value: "16", label: t("settings.ageOption16") },
  { value: "17", label: t("settings.ageOption17") },
  { value: "18", label: t("settings.ageOption18") },
];

// ── Confirmation Dialog ───────────────────────────────────────────────────────
function ResetConfirmDialog({ onConfirm, onCancel }) {
  const t = useTranslate();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <WarningIcon size={32} />
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12, marginBottom: 8 }}>
          {t("settings.resetConfirmTitle")}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 24 }}>
          {t("settings.resetConfirmDesc")}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {t("settings.yesReset")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Version & Update Section ──────────────────────────────────────────────────
function VersionSection() {
  const t = useTranslate();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [autoCheck, setAutoCheck] = useState(() => {
    const stored = storage.get(STORAGE_KEYS.AUTO_CHECK_UPDATES);
    return stored === null || stored === undefined ? true : !!stored;
  });
  const [autoSaved, setAutoSaved] = useState(false);
  const [currentVersion, setCurrentVersion] = useState("0.0.0");
  const [updateUrl, setUpdateUrl] = useState(
    () => storage.get(STORAGE_KEYS.UPDATE_URL) || "",
  );
  const [urlSaved, setUrlSaved] = useState(false);

  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then((v) => setCurrentVersion(v));
    }
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setResult(null);
    try {
      const r = await checkForUpdates();
      setResult(r);
    } catch (e) {
      setResult({ error: e.message || t("settings.updateCheckFailed") });
    } finally {
      setChecking(false);
    }
  };

  const toggleAuto = (val) => {
    setAutoCheck(val);
    storage.set(STORAGE_KEYS.AUTO_CHECK_UPDATES, val ? 1 : 0);
    setAutoSaved(true);
    setTimeout(() => setAutoSaved(false), 1800);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.appVersion")}</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>{t("settings.currentVersion")}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{currentVersion}</span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={runCheck}
          disabled={checking}
        >
          {checking ? t("settings.checking") : t("settings.checkUpdates")}
        </button>
      </div>

      {result && !result.error && result.skipped && (
        <span style={{ fontSize: 13, color: "var(--text3)", display: "block", marginBottom: 16 }}>
          {t("settings.noUpdateUrl")}
        </span>
      )}

      {result && !result.error && !result.skipped && result.hasUpdate && (
        <button
          onClick={() => {
            if (result.url && window.electron?.openExternal) {
              window.electron.openExternal(result.url);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "color-mix(in srgb, var(--red) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--red) 40%, transparent)",
            color: "var(--red)",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: result.url ? "pointer" : "default",
            transition: "background 0.2s",
            marginBottom: 16,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "color-mix(in srgb, var(--red) 22%, transparent)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "color-mix(in srgb, var(--red) 12%, transparent)")
          }
        >
          <CelebrationIcon size={16} /> v{result.latest} {t("settings.availableDownload")}
        </button>
      )}

      {result && !result.error && !result.skipped && !result.hasUpdate && (
        <span style={{ fontSize: 13, color: "#48c774", fontWeight: 500, display: "block", marginBottom: 16 }}>
          {t("settings.upToDate")}
        </span>
      )}

      {result?.error && (
        <span style={{ fontSize: 13, color: "var(--red)", display: "block", marginBottom: 16 }}>
          ✕ {result.error}
        </span>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
          {t("settings.updateServerUrl")}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            value={updateUrl}
            onChange={(e) => setUpdateUrl(e.target.value)}
            placeholder={t("settings.updateUrlPlaceholder")}
            style={{
              flex: "1 1 300px",
              maxWidth: 460,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "6px 14px" }}
            onClick={() => {
              storage.set(STORAGE_KEYS.UPDATE_URL, updateUrl);
              setUrlSaved(true);
              setTimeout(() => setUrlSaved(false), 1800);
            }}
          >
            {t("settings.saveUrl")}
          </button>
          {urlSaved && <span style={{ fontSize: 12, color: "#48c774" }}>{t("common.saved")}</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
          {t("settings.updateUrlDesc")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Toggle
          value={autoCheck}
          onChange={toggleAuto}
          title={autoCheck ? t("settings.disableAutoCheck") : t("settings.enableAutoCheck")}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
            {t("settings.autoCheckUpdates")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {t("settings.autoCheckDesc")}
          </div>
        </div>
        {autoSaved && (
          <span style={{ fontSize: 12, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Home Layout Section ───────────────────────────────────────────────────────
function HomeLayoutSection() {
  const t = useTranslate();
  const [order, setOrder] = useState(() => {
    const { order: o } = loadHomeLayout();
    return o;
  });
  const [visible, setVisible] = useState(() => {
    const { visible: v } = loadHomeLayout();
    return v;
  });
  const [viewMode, setViewMode] = useState(() => loadHomeViewMode());
  const [saved, setSaved] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const handleDragStart = (idx) => {
    dragItem.current = idx;
  };
  const handleDragEnter = (idx) => {
    dragOver.current = idx;
  };
  const handleDragEnd = () => {
    const newOrder = [...order];
    const dragged = newOrder.splice(dragItem.current, 1)[0];
    newOrder.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setOrder(newOrder);
  };

  const toggleVisible = (id) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    storage.set(STORAGE_KEYS.HOME_ROW_ORDER, order);
    storage.set(STORAGE_KEYS.HOME_ROW_VISIBLE, visible);
    saveHomeViewMode(viewMode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const rowLabels = Object.fromEntries(HOME_ROWS.map((r) => [r.id, r.label]));

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.homeLayout")}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        {t("settings.homeLayoutDesc")}
      </div>

      {/* ── View mode selector ── */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("settings.rowDisplayStyle")}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {[
            {
              value: "carousel",
              label: t("settings.carousel"),
              desc: t("settings.carouselDesc"),
            },
            {
              value: "list",
              label: t("settings.grid"),
              desc: t("settings.gridDesc"),
            },
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              style={{
                flex: 1,
                maxWidth: 220,
                padding: "10px 14px",
                borderRadius: 8,
                border: `2px solid ${viewMode === value ? "var(--red)" : "var(--border)"}`,
                background:
                  viewMode === value
                    ? "color-mix(in srgb, var(--red) 12%, var(--surface))"
                    : "var(--surface)",
                color: viewMode === value ? "var(--text)" : "var(--text2)",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
              <div
                style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}
              >
                {desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 480,
        }}
      >
        {order.map((id, idx) => (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "grab",
              opacity: visible[id] ? 1 : 0.45,
              transition: "opacity 0.2s",
              userSelect: "none",
            }}
          >
            {/* Drag handle */}
            <span
              style={{
                color: "var(--text3)",
                fontSize: 16,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ⠿
            </span>

            {/* Label */}
            <span
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--text)",
              }}
            >
              {rowLabels[id] || id}
            </span>

            {/* Toggle */}
            <Toggle
              value={visible[id]}
              onChange={() => toggleVisible(id)}
              title={visible[id] ? t("settings.hideRow") : t("settings.showRow")}
            />
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          {t("settings.saveLayout")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Scheduled Backup Section ──────────────────────────────────────────────────
function getFrequencyOptions(t) {
  return [
    { value: "startup", label: t("settings.freqStartup") },
    { value: "daily", label: t("settings.freqDaily") },
    { value: "weekly", label: t("settings.freqWeekly") },
    { value: "monthly", label: t("settings.freqMonthly") },
  ];
}

function ScheduledBackupSection() {
  const t = useTranslate();
  const FREQUENCY_OPTIONS = getFrequencyOptions(t);
  const [enabled, setEnabled] = useState(false);
  const [backupPath, setBackupPath] = useState("");
  const [keepCount, setKeepCount] = useState(5);
  const [frequency, setFrequency] = useState("startup");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isElectron) {
      setLoading(false);
      return;
    }
    window.electron.getScheduledBackupSettings().then((s) => {
      if (s) {
        setEnabled(!!s.enabled);
        setBackupPath(s.path || "");
        setKeepCount(s.keepCount ?? 5);
        setFrequency(s.frequency || "startup");
      }
      setLoading(false);
    });
  }, []);

  const pickFolder = async () => {
    if (!isElectron) return;
    const folder = await window.electron.pickFolder();
    if (folder) setBackupPath(folder);
  };

  const handleSave = async () => {
    if (!isElectron) return;
    const settings = {
      enabled,
      path: backupPath,
      keepCount: Math.max(1, Math.min(99, Number(keepCount) || 5)),
      frequency,
      lastRun: null,
    };
    // preserve lastRun from existing settings
    const existing = await window.electron.getScheduledBackupSettings();
    if (existing?.lastRun) settings.lastRun = existing.lastRun;
    await window.electron.setScheduledBackupSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isElectron || loading) return null;

  return (
    <div
      style={{
        marginTop: 28,
        padding: "20px 22px",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
      }}
    >
      {/* Header row with toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: enabled ? 20 : 0,
        }}
      >
        <Toggle value={enabled} onChange={setEnabled} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
            {t("settings.scheduledBackups")}
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            {t("settings.scheduledBackupsDesc")}
          </div>
        </div>
      </div>

      {enabled && (
        <>
          {/* Backup path */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text2)",
                marginBottom: 6,
              }}
            >
              {t("settings.backupFolder")}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="apikey-input"
                style={{ flex: 1, marginBottom: 0 }}
                placeholder={t("settings.backupFolderPlaceholder")}
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "7px 14px", fontSize: 13 }}
                onClick={pickFolder}
              >
                {t("settings.browse")}
              </button>
            </div>
          </div>

          {/* Frequency + Keep count row */}
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text2)",
                  marginBottom: 6,
                }}
              >
                {t("settings.frequency")}
              </div>
              <SettingsSelect
                value={frequency}
                onChange={(v) => setFrequency(v)}
                options={FREQUENCY_OPTIONS}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 120 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text2)",
                  marginBottom: 6,
                }}
              >
                {t("settings.keepLastN")}
              </div>
              <input
                type="number"
                min={1}
                max={99}
                className="apikey-input"
                style={{ width: "100%", marginBottom: 0 }}
                value={keepCount}
                onChange={(e) => setKeepCount(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" onClick={handleSave}>
              {t("common.save")}
            </button>
            {saved && (
              <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
            )}
          </div>
        </>
      )}

      {!enabled && (
        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 0 }}
        >
          {/* empty, toggle handles everything */}
        </div>
      )}
    </div>
  );
}

// ── Backup & Restore ─────────────────────────────────────────────────────────
function BackupRestoreSection({ onRestored }) {
  const t = useTranslate();
  const [restoreStatus, setRestoreStatus] = useState(null);

  const handleExport = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: collectBackupData(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sinex-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup?.data)
          throw new Error(t("settings.invalidBackup"));
        restoreBackupData(backup.data);
        setRestoreStatus(t("settings.backupRestored"));
        setTimeout(() => window.location.reload(), 1200);
        onRestored?.();
      } catch (err) {
        setRestoreStatus("✕ " + (err.message || t("settings.cantReadBackup")));
        setTimeout(() => setRestoreStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.backupRestore")}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 20,
          lineHeight: 1.6,
        }}
      >
        {t("settings.backupRestoreDesc")}
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button className="btn btn-primary" onClick={handleExport}>
          {t("settings.exportBackup")}
        </button>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 18px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surface)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "var(--surface2)")
          }
        >
          {t("settings.importBackup")}
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </label>
        {restoreStatus && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: restoreStatus.startsWith("✕") ? "var(--red)" : "#48c774",
            }}
          >
            {restoreStatus}
          </span>
        )}
      </div>
      <ScheduledBackupSection />
    </div>
  );
}

// ── Theme Section ─────────────────────────────────────────────────────────────
function ThemeSection() {
  const tt = useTranslate();
  const currentAccent = storage.get(STORAGE_KEYS.ACCENT_COLOR) || "apple-blue";
  const [themeId, setThemeId] = useState(() => {
    const savedTheme = storage.get("theme");
    if (savedTheme) return savedTheme;
    const match = THEME_PRESETS.find((t) => t.accentId === currentAccent);
    return match ? match.id : "sinex";
  });
  const [themeSaved, setThemeSaved] = useState(false);

  const handleApply = (id) => {
    setThemeId(id);
    storage.set("theme", id);
    applyTheme(id);
    setThemeSaved(true);
    setTimeout(() => setThemeSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{tt("settings.theme")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {THEME_PRESETS.map((t) => {
          const active = themeId === t.id;
          const preset = ACCENT_PRESETS.find((p) => p.id === t.accentId);
          return (
            <button
              key={t.id}
              onClick={() => handleApply(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                background: active ? "var(--surface3)" : "var(--surface2)",
                border: active
                  ? "1px solid var(--red)"
                  : "1px solid var(--border)",
                borderRadius: 10,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: preset?.color || "#007AFF",
                  flexShrink: 0,
                  boxShadow: active ? `0 0 0 3px ${preset?.color}40` : "none",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: active ? "var(--text)" : "var(--text2)",
                  }}
                >
                  {t.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  {t.description}
                </div>
              </div>
              {active && (
                <span style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>
                  {tt("common.active")}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {themeSaved && (
        <span style={{ fontSize: 13, color: "#48c774", marginTop: 8, display: "inline-block" }}>
          {tt("common.applied", { label: "" })}
        </span>
      )}
    </div>
  );
}

// ── Developer Error Debug ─────────────────────────────────────────────────────
function DeveloperErrorDebug() {
  const t = useTranslate();
  const [logs, setLogs] = useState(() => getErrorLogs());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setLogs(getErrorLogs()), 2000);
    return () => clearInterval(id);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatErrorLogs() || "(no errors)");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    clearErrorLogs();
    setLogs([]);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">Developer Error Debug</div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        {logs.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "16px 0" }}>
            No errors logged
          </div>
        ) : (
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              fontSize: 11,
              fontFamily: "monospace",
              color: "var(--text2)",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            {logs.map((e, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                  [{e.source}]
                </span>{" "}
                <span style={{ fontSize: 10, color: "var(--text3)" }}>{e.time}</span>
                <div>{e.message}</div>
                {e.detail && (
                  <div style={{ color: "var(--text3)", fontSize: 10, marginTop: 2 }}>{e.detail}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              background: copied ? "var(--accent)" : "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: copied ? "#fff" : "var(--text1)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 0",
              transition: "background 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy All"}
          </button>
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text3)",
                cursor: "pointer",
                fontSize: 13,
                padding: "10px 18px",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── About Section ─────────────────────────────────────────────────────────────
function AboutSection() {
  const t = useTranslate();
  const [appVersion, setAppVersion] = useState("2.4.0");
  useEffect(() => {
    if (window.electron?.getAppVersion) {
      window.electron.getAppVersion().then(setAppVersion).catch(() => {});
    }
  }, []);
  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.aboutApp")}</div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "28px 32px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            letterSpacing: 1,
            marginBottom: 4,
          }}
        >
          SineX
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
          {t("app.version", { version: appVersion })}
        </div>

        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, marginBottom: 20 }}>
          {t("app.description")}
        </div>

        <Divider />

        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7, marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutStreaming")}
          </p>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutDownloading")}
          </p>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutSubtitles")}
          </p>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutCustomizability")}
          </p>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutLibrary")}
          </p>
          <p style={{ marginBottom: 8 }}>
            {t("settings.aboutPrivacy")}
          </p>
        </div>

        <Divider />

        <div
          style={{
            fontSize: 12,
            color: "var(--text3)",
            marginTop: 16,
            lineHeight: 1.7,
            fontStyle: "italic",
          }}
        >
          {t("app.inspiredBy")}
          <br />
          {t("app.license")}
        </div>
      </div>
    </div>
  );
}

// ── Start Page Section ────────────────────────────────────────────────────────
// ── Appearance Section ────────────────────────────────────────────────────────
function AppearanceSection() {
  const t = useTranslate();
  const [accent, setAccent] = useState(
    () => storage.get(STORAGE_KEYS.ACCENT_COLOR) || "apple-blue",
  );
  const [fontSize, setFontSize] = useState(
    () => storage.get(STORAGE_KEYS.FONT_SIZE) || "normal",
  );
  const [compact, setCompact] = useState(
    () => !!storage.get(STORAGE_KEYS.COMPACT_MODE),
  );
  const [noAnim, setNoAnim] = useState(
    () => !!storage.get(STORAGE_KEYS.REDUCE_ANIMATIONS),
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.ACCENT_COLOR, accent);
    storage.set(STORAGE_KEYS.FONT_SIZE, fontSize);
    storage.set(STORAGE_KEYS.COMPACT_MODE, compact ? 1 : 0);
    storage.set(STORAGE_KEYS.REDUCE_ANIMATIONS, noAnim ? 1 : 0);
    // Apply immediately
    applyAccentColor(accent);
    const zoomMap = { sm: 0.85, normal: 1, lg: 1.15 };
    if (window.electron?.setZoomFactor)
      window.electron.setZoomFactor(zoomMap[fontSize] ?? 1);
    document.body.classList.toggle("compact-mode", compact);
    document.body.classList.toggle("no-anim", noAnim);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.appearance")}</div>

      {/* Accent Colour */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 10,
          }}
        >
          {t("settings.accentColour")}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setAccent(p.id)}
              title={p.label}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: p.color,
                border:
                  accent === p.id
                    ? `3px solid var(--text)`
                    : "3px solid transparent",
                outline: accent === p.id ? `2px solid ${p.color}` : "none",
                outlineOffset: 2,
                cursor: "pointer",
                transition: "transform 0.15s",
                transform: accent === p.id ? "scale(1.15)" : "scale(1)",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>
          {t("settings.accentApplied", { label: ACCENT_PRESETS.find((p) => p.id === accent)?.label })}
        </div>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 10,
          }}
        >
          {t("settings.fontSize")}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "sm", label: t("settings.fontSmall") },
            { id: "normal", label: t("settings.fontNormal") },
            { id: "lg", label: t("settings.fontLarge") },
          ].map((o) => (
            <button
              key={o.id}
              onClick={() => setFontSize(o.id)}
              className={
                fontSize === o.id ? "btn btn-primary" : "btn btn-ghost"
              }
              style={{
                padding: "7px 18px",
                fontSize: o.id === "sm" ? 12 : o.id === "lg" ? 16 : 14,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={compact} onChange={setCompact} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              {t("settings.compactGrid")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {t("settings.compactGridDesc")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={noAnim} onChange={setNoAnim} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              {t("settings.reduceAnimations")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {t("settings.reduceAnimationsDesc")}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Library & Privacy Section ─────────────────────────────────────────────────
function LibraryPrivacySection() {
  const t = useTranslate();
  const [sort, setSort] = useState(
    () => storage.get(STORAGE_KEYS.LIBRARY_SORT) || "manual",
  );
  const [historyEnabled, setHistoryEnabled] = useState(() => {
    const v = storage.get(STORAGE_KEYS.HISTORY_ENABLED);
    return v === 0 || v === false ? false : true;
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.LIBRARY_SORT, sort);
    storage.set(STORAGE_KEYS.HISTORY_ENABLED, historyEnabled ? 1 : 0);
    window.dispatchEvent(
      new CustomEvent("sinex:library-sort-changed", { detail: sort }),
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const SORT_OPTIONS = [
    { value: "manual", label: t("settings.sortCustom") },
    { value: "title", label: t("settings.sortTitle") },
    { value: "rating", label: t("settings.sortRating") },
    { value: "year", label: t("settings.sortYear") },
  ];

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.libraryPrivacy")}</div>

      {/* Watchlist Sort */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          {t("settings.watchlistSort")}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text3)",
            marginBottom: 12,
            lineHeight: 1.6,
          }}
        >
          {t("settings.watchlistSortDesc")}
        </div>
        <SettingsSelect
          value={sort}
          onChange={(v) => setSort(v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Watch History Toggle */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle value={historyEnabled} onChange={setHistoryEnabled} />
          <div>
            <div
              style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}
            >
              {t("settings.recordHistory")}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
              {t("settings.recordHistoryDesc")}
            </div>
          </div>
        </div>
        {!historyEnabled && (
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "var(--red)",
              background: "color-mix(in srgb, var(--red) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--red) 20%, transparent)",
              borderRadius: 8,
              padding: "10px 14px",
            }}
          >
            {t("settings.historyDisabledWarning")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

function StartPageSection() {
  const t = useTranslate();
  const [startPage, setStartPage] = useState(
    () => storage.get(STORAGE_KEYS.START_PAGE) || "home",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.set(STORAGE_KEYS.START_PAGE, startPage);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.startPage")}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        {t("settings.startPageDesc")}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <SettingsSelect
          value={startPage}
          onChange={(v) => setStartPage(v)}
          options={[
            { value: "home", label: t("settings.startPageHome") },
            { value: "history", label: t("settings.startPageLibrary") },
            { value: "downloads", label: t("settings.startPageDownloads") },
          ]}
        />
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── TMDB Metadata Language ────────────────────────────────────────────────────
const LANGUAGES = [
  { tmdb: "en-US", subtitle: "en", label: "English" },
  { tmdb: "vi-VN", subtitle: "vi", label: "Tiếng Việt" },
  { tmdb: "de-DE", subtitle: "de", label: "Deutsch" },
  { tmdb: "fr-FR", subtitle: "fr", label: "Français" },
  { tmdb: "es-ES", subtitle: "es", label: "Español" },
  { tmdb: "it-IT", subtitle: "it", label: "Italiano" },
  { tmdb: "pt-BR", subtitle: "pt", label: "Português (Brasil)" },
  { tmdb: "nl-NL", subtitle: "nl", label: "Nederlands" },
  { tmdb: "pl-PL", subtitle: "pl", label: "Polski" },
  { tmdb: "sv-SE", subtitle: "sv", label: "Svenska" },
  { tmdb: "nb-NO", subtitle: "nb", label: "Norsk" },
  { tmdb: "da-DK", subtitle: "da", label: "Dansk" },
  { tmdb: "fi-FI", subtitle: "fi", label: "Suomi" },
  { tmdb: "tr-TR", subtitle: "tr", label: "Türkçe" },
  { tmdb: "ru-RU", subtitle: "ru", label: "Русский" },
  { tmdb: "ja-JP", subtitle: "ja", label: "日本語" },
  { tmdb: "ko-KR", subtitle: "ko", label: "한국어" },
  { tmdb: "zh-CN", subtitle: "zh-CN", label: "中文 (简体)" },
  { tmdb: "ar-SA", subtitle: "ar", label: "العربية" },
];

function LanguageSection() {
  const t = useTranslate();
  const [lang, setLang] = useState(
    () => storage.get(STORAGE_KEYS.TMDB_LANG) || "en-US",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const entry = LANGUAGES.find((l) => l.tmdb === lang);
    storage.set(STORAGE_KEYS.TMDB_LANG, lang);
    storage.set(STORAGE_KEYS.SUBTITLE_LANG, entry?.subtitle || "en");
    clearTmdbCache();
    window.dispatchEvent(new CustomEvent("sinex:tmdb-lang-changed"));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.language")}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        {t("settings.languageDesc")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SettingsSelect
          value={lang}
          onChange={(v) => setLang(v)}
          options={LANGUAGES.map((l) => ({
            value: l.tmdb,
            label: l.label,
          }))}
        />
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Subtitle Settings ─────────────────────────────────────────────────────────
function SubtitleSettingsSection() {
  const t = useTranslate();
  const [enabled, setEnabled] = useState(
    () =>
      storage.get(STORAGE_KEYS.SUBTITLE_ENABLED) !== 0 &&
      storage.get(STORAGE_KEYS.SUBTITLE_ENABLED) !== "0",
  );
  const [subdlApiKey, setSubdlApiKey] = useState("");
  const [showSubdlKey, setShowSubdlKey] = useState(false);
  const [wyzieApiKey, setWyzieApiKey] = useState("");
  const [showWyzieKey, setShowWyzieKey] = useState(false);
  const [wyzieCopied, setWyzieCopied] = useState(false);
  const [wyzieRedeeming, setWyzieRedeeming] = useState(false);
  const [wyzieError, setWyzieError] = useState("");
  const [wyzieClearConfirm, setWyzieClearConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load keys from secure storage
  useEffect(() => {
    secureStorage.get(STORAGE_KEYS.SUBDL_API_KEY).then((val) => {
      if (val) setSubdlApiKey(val);
    });
    secureStorage.get(STORAGE_KEYS.WYZIE_API_KEY).then((val) => {
      if (val) setWyzieApiKey(val);
    });
  }, []);

  const hasSubdlKey = subdlApiKey.trim().length > 0;
  const hasWyzieKey = wyzieApiKey.trim().length > 0;

  const handleWyzieRedeem = async () => {
    if (!window.electron) return;
    setWyzieRedeeming(true);
    setWyzieError("");
    try {
      const res = await window.electron.wyzieOpenRedeem();
      if (res.cancelled) {
        setWyzieRedeeming(false);
        return;
      }
      if (res.timeout) {
        setWyzieError(
          t("settings.wyzieTimeout"),
        );
        setWyzieRedeeming(false);
        return;
      }
      if (res.ok && res.key) {
        // Key came from redirect URL — save directly, no extra validation
        setWyzieApiKey(res.key);
        await secureStorage.set(STORAGE_KEYS.WYZIE_API_KEY, res.key);
        setWyzieError("");
      } else {
        setWyzieError(
          t("settings.wyzieExtractFail"),
        );
      }
    } catch (e) {
      setWyzieError(e.message);
    }
    setWyzieRedeeming(false);
  };

  const handleWyzieCopy = () => {
    navigator.clipboard.writeText(wyzieApiKey.trim()).then(() => {
      setWyzieCopied(true);
      setTimeout(() => setWyzieCopied(false), 1500);
    });
  };

  const handleSave = () => {
    storage.set(STORAGE_KEYS.SUBTITLE_ENABLED, enabled ? 1 : 0);
    secureStorage.set(STORAGE_KEYS.SUBDL_API_KEY, subdlApiKey.trim());
    secureStorage.set(STORAGE_KEYS.WYZIE_API_KEY, wyzieApiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.subtitleDownloads")}</div>

      {/* Source info */}
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 20,
          lineHeight: 1.7,
        }}
      >
        {t("settings.subtitleSourceInfo")}
        {hasSubdlKey && (
          <span
            style={{
              display: "inline-block",
              marginLeft: 8,
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 3,
              background: "rgba(99,149,255,0.15)",
              color: "#6395ff",
              border: "1px solid rgba(99,149,255,0.3)",
            }}
          >
            {t("settings.subdlActive")}
          </span>
        )}
      </div>

      {/* Enable toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Toggle value={enabled} onChange={setEnabled} />
        <span
          style={{
            fontSize: 14,
            color: enabled ? "var(--text)" : "var(--text3)",
          }}
        >
          {enabled
            ? t("settings.subtitleAuto")
            : t("settings.subtitleDisabled")}
        </span>
      </div>

      {enabled && (
        <>
          {/* Wyzie API key */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
            >
              {t("settings.wyzieApiKey")}{" "}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: hasWyzieKey
                    ? "rgba(99,202,183,0.12)"
                    : "rgba(255,180,80,0.12)",
                  color: hasWyzieKey ? "#63cab7" : "#ffb450",
                  border: `1px solid ${hasWyzieKey ? "rgba(99,202,183,0.25)" : "rgba(255,180,80,0.25)"}`,
                }}
              >
                {hasWyzieKey ? t("common.set") : t("common.required")}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text3)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {t("settings.wyzieRequired")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="apikey-input"
                style={{ flex: 1, maxWidth: 340, marginBottom: 0 }}
                type={showWyzieKey ? "text" : "password"}
                placeholder={t("settings.wyziePlaceholder")}
                value={wyzieApiKey}
                onChange={(e) => setWyzieApiKey(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setShowWyzieKey((v) => !v)}
              >
                {showWyzieKey ? t("common.hide") : t("common.show")}
              </button>
              {hasWyzieKey && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={handleWyzieCopy}
                  title={t("common.copy")}
                >
                  {wyzieCopied ? t("common.copied") : t("common.copy")}
                </button>
              )}
              {hasWyzieKey && (
                <button
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() =>
                    window.electron?.openExternal(
                      `https://sub.wyzie.io/notice?key=${wyzieApiKey.trim()}`,
                    )
                  }
                  title={t("settings.wyzieNoticeTitle")}
                >
                  {t("settings.wyzieNotice")}
                </button>
              )}
              {wyzieRedeeming ? (
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {t("settings.openingRedeem")}
                </span>
              ) : !hasWyzieKey ? (
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    color: "var(--accent)",
                  }}
                  onClick={handleWyzieRedeem}
                >
                  {t("settings.wyzieGetKey")}
                </button>
              ) : null}
            </div>
            {wyzieError && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#ff6060",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "rgba(255,80,80,0.08)",
                  border: "1px solid rgba(255,80,80,0.2)",
                }}
              >
                {wyzieError}
              </div>
            )}
          </div>

          {/* SubDL API key */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}
            >
              {t("settings.subdlApiKey")}{" "}
              <span
                style={{
                  color: "var(--text3)",
                  cursor: "pointer",
                  fontSize: 11,
                }}
                onClick={() =>
                  window.electron?.openExternal("https://subdl.com/settings")
                }
              >
                {t("settings.subdlRegister")}
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: 3,
                  background: "rgba(99,202,183,0.12)",
                  color: "#63cab7",
                  border: "1px solid rgba(99,202,183,0.25)",
                }}
              >
                {t("common.optional")}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text3)",
                marginBottom: 8,
                lineHeight: 1.5,
              }}
            >
              {t("settings.subdlDesc")}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="apikey-input"
                style={{ flex: 1, maxWidth: 400, marginBottom: 0 }}
                type={showSubdlKey ? "text" : "password"}
                placeholder={t("settings.subdlPlaceholder")}
                value={subdlApiKey}
                onChange={(e) => setSubdlApiKey(e.target.value)}
              />
              <button
                className="btn btn-ghost"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setShowSubdlKey((v) => !v)}
              >
                {showSubdlKey ? t("common.hide") : t("common.show")}
              </button>
              {subdlApiKey.trim() && (
                <button
                  className="btn btn-ghost"
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    color: "var(--text3)",
                  }}
                  onClick={() => setSubdlApiKey("")}
                  title={t("settings.clearKey")}
                >
                  {t("common.clear")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div
        style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}
      >
        <button className="btn btn-primary" onClick={handleSave}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#4caf50" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Notifications Section ─────────────────────────────────────────────────────
function NotificationsSection() {
  const t = useTranslate();
  const [notifyDownload, setNotifyDownload] = useState(
    () => storage.get(STORAGE_KEYS.NOTIFY_DOWNLOAD_COMPLETE) !== false,
  );
  const [notifyEpisode, setNotifyEpisode] = useState(() => {
    const stored = storage.get(STORAGE_KEYS.NOTIFY_NEW_EPISODE);
    return stored === null || stored === undefined ? true : !!stored;
  });
  const [saved, setSaved] = useState(false);

  const saveSettings = () => {
    storage.set(STORAGE_KEYS.NOTIFY_DOWNLOAD_COMPLETE, notifyDownload);
    storage.set(STORAGE_KEYS.NOTIFY_NEW_EPISODE, notifyEpisode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ToggleRow = ({ label, description, value, onChange }) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <Toggle value={value} onChange={onChange} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text3)",
            marginTop: 3,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginBottom: 40 }}>
      <div className="settings-section-title">{t("settings.desktopNotifications")}</div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text3)",
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        {t("settings.notificationsDesc2")}
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "0 16px",
          marginBottom: 20,
        }}
      >
        <ToggleRow
          label={t("settings.notifyDownloadComplete")}
          description={t("settings.notifyDownloadCompleteDesc")}
          value={notifyDownload}
          onChange={setNotifyDownload}
        />
        <ToggleRow
          label={t("settings.notifyNewEpisodes")}
          description={t("settings.notifyNewEpisodesDesc")}
          value={notifyEpisode}
          onChange={setNotifyEpisode}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-primary" onClick={saveSettings}>
          {t("common.save")}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: "#48c774" }}>{t("common.saved")}</span>
        )}
      </div>
    </div>
  );
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────────
function ConfirmDialog({ title, description, confirmLabel, onConfirm, onCancel }) {
  const t = useTranslate();
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 460,
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6, marginBottom: 24 }}>
          {description}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>
            {t("common.cancel")}
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toggle Switch ───────────────────────────────────────────────────────────────
function Toggle({ value, onChange, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      title={title}
      onClick={() => onChange(!value)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: value ? "var(--red)" : "var(--border)",
        border: "none",
        outline: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: value ? 21 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

// ── Clean Row ──────────────────────────────────────────────────────────────────
function CleanRow({ title, description, buttonLabel, onAction, sizeLabel, danger }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.6 }}>
          {description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, paddingTop: 2 }}>
        {sizeLabel && (
          <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>
            {sizeLabel}
          </span>
        )}
        <button
          className="btn"
          onClick={onAction}
          style={{
            color: danger ? "var(--red)" : "var(--text)",
            background: danger
              ? "color-mix(in srgb, var(--red) 8%, transparent)"
              : "var(--surface2)",
            border: danger
              ? "1px solid color-mix(in srgb, var(--red) 30%, transparent)"
              : "1px solid var(--border)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (danger) {
              e.currentTarget.style.background = "color-mix(in srgb, var(--red) 20%, transparent)";
            }
          }}
          onMouseLeave={(e) => {
            if (danger) {
              e.currentTarget.style.background = "color-mix(in srgb, var(--red) 8%, transparent)";
            }
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

// ── Section Group Header ──────────────────────────────────────────────────────
function SectionGroupHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32, marginTop: 4 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            letterSpacing: 2,
            color: "var(--red)",
            textTransform: "uppercase",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        <div
          style={{ flex: 1, height: 1, background: "color-mix(in srgb, var(--red) 18%, transparent)" }}
        />
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text3)", lineHeight: 1.5 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function Divider() {
  return (
    <div style={{ height: 1, background: "var(--border)", marginBottom: 40 }} />
  );
}

// ── Search & Nav Bar ──────────────────────────────────────────────────────────
const SUPPORTS_HIGHLIGHT =
  typeof CSS !== "undefined" && typeof CSS.highlights !== "undefined";
const getSectionNav = (t) => [
  {
    id: "updates",
    label: t("settings.sectionUpdates"),
    icon: "↑",
    keywords: [
      "update",
      "version",
      "tmdb",
      "api",
      "token",
      "key",
      "check",
      "startup",
      "auto",
      "app",
      "language",
      "metadata",
      "locale",
      "german",
      "french",
      "spanish",
    ],
  },
  {
    id: "content",
    label: t("settings.sectionContent"),
    icon: "🔞",
    keywords: [
      "age",
      "rating",
      "parental",
      "content",
      "country",
      "restriction",
      "pg",
      "fsk",
      "adults",
    ],
  },
  {
    id: "playback",
    label: t("settings.sectionPlayback"),
    icon: "▶",
    keywords: [
      "invidious",
      "trailer",
      "youtube",
      "threshold",
      "watched",
      "playback",
      "seconds",
      "mark",
      "auto-watched",
      "intro",
      "skip",
      "aniskip",
      "anime",
      "outro",
    ],
  },
  {
    id: "subtitles",
    label: t("settings.sectionSubtitles"),
    icon: "CC",
    keywords: [
      "subtitle",
      "subdl",
      "wyzie",
      "language",
      "caption",
      "srt",
      "download",
      "cc",
    ],
  },
  {
    id: "downloads",
    label: t("settings.sectionDownloads"),
    icon: "⬇",
    keywords: [
      "download",
      "folder",
      "path",
      "save",
      "video",
      "movies",
      "files",
    ],
  },
  {
    id: "notifications",
    label: t("settings.sectionNotifications"),
    icon: "🔔",
    keywords: [
      "notification",
      "notify",
      "alert",
      "desktop",
      "episode",
      "download",
      "watchlist",
      "new episode",
      "release",
    ],
  },
  {
    id: "interface",
    label: t("settings.sectionInterface"),
    icon: "✦",
    keywords: [
      "home",
      "layout",
      "start page",
      "appearance",
      "accent",
      "colour",
      "color",
      "font",
      "compact",
      "animation",
      "theme",
      "rows",
      "hero",
    ],
  },
  {
    id: "library",
    label: t("settings.sectionLibrary"),
    icon: "📖",
    keywords: [
      "library",
      "watchlist",
      "sort",
      "history",
      "privacy",
      "watch history",
      "continue",
    ],
  },
  {
    id: "backup",
    label: t("settings.sectionBackup"),
    icon: "💾",
    keywords: [
      "backup",
      "restore",
      "export",
      "import",
      "scheduled",
      "json",
      "backup file",
    ],
  },
  {
    id: "storage",
    label: t("settings.sectionStorage"),
    icon: "🗄",
    keywords: [
      "storage",
      "cache",
      "clear",
      "reset",
      "delete",
      "data",
      "wipe",
      "progress",
      "factory",
    ],
  },
  {
    id: "about",
    label: t("settings.sectionAbout"),
    icon: "ⓘ",
    keywords: [
      "about",
      "info",
      "version",
      "credits",
      "license",
      "sinex",
    ],
  },
];

function SettingsTopBar({ sectionRefs, contentRef }) {
  const t = useTranslate();
  const SECTION_NAV = getSectionNav(t);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const matchRanges = useRef([]);
  const currentMatchRef = useRef(0);
  const matchCountRef = useRef(0);
  const inputRef = useRef(null);
  const navRef = useRef(null);
  const searchBarRef = useRef(null);
  const debounceTimer = useRef(null);
  const rafHandle = useRef(null);

  const clearHighlights = () => {
    if (SUPPORTS_HIGHLIGHT) {
      CSS.highlights.delete("settings-search");
      CSS.highlights.delete("settings-search-active");
    }
    matchRanges.current = [];
    matchCountRef.current = 0;
    currentMatchRef.current = 0;
    setMatchCount(0);
    setCurrentMatch(0);
  };

  const scrollToRange = (range) => {
    if (!range) return;
    if (rafHandle.current) cancelAnimationFrame(rafHandle.current);
    rafHandle.current = requestAnimationFrame(() => {
      rafHandle.current = null;
      try {
        const el = range.startContainer.parentElement;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (_) {}
    });
  };

  const setActiveMatch = (idx) => {
    const range = matchRanges.current[idx];
    if (!range) return;
    if (SUPPORTS_HIGHLIGHT) {
      CSS.highlights.set("settings-search-active", new Highlight(range));
    }
    scrollToRange(range);
    currentMatchRef.current = idx + 1;
    setCurrentMatch(idx + 1);
  };

  const runSearch = (searchQuery) => {
    clearHighlights();
    if (!contentRef?.current || !searchQuery.trim()) return;

    const str = searchQuery.toLowerCase();
    const ranges = [];
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.toLowerCase();
      let idx = 0;
      while ((idx = text.indexOf(str, idx)) !== -1) {
        const range = new Range();
        range.setStart(node, idx);
        range.setEnd(node, idx + searchQuery.length);
        ranges.push(range);
        idx += str.length;
      }
    }

    matchRanges.current = ranges;
    matchCountRef.current = ranges.length;
    setMatchCount(ranges.length);

    if (ranges.length > 0) {
      if (SUPPORTS_HIGHLIGHT) {
        const hl = new Highlight();
        for (const r of ranges) hl.add(r);
        CSS.highlights.set("settings-search", hl);
      }
      setActiveMatch(0);
    }
  };

  const findMatches = (searchQuery) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      runSearch(searchQuery);
    }, 80);
  };

  const goNext = () => {
    const total = matchCountRef.current;
    if (total === 0) return;
    const next = currentMatchRef.current < total ? currentMatchRef.current : 0;
    setActiveMatch(next);
  };

  const goPrev = () => {
    const total = matchCountRef.current;
    if (total === 0) return;
    const prev =
      currentMatchRef.current > 1 ? currentMatchRef.current - 2 : total - 1;
    setActiveMatch(prev);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    clearHighlights();
  };

  // Focus on open
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [searchOpen]);

  // Clean up on unmount
  useEffect(
    () => () => {
      clearHighlights();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (rafHandle.current) cancelAnimationFrame(rafHandle.current);
    },
    [],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        closeSearch();
        setNavOpen(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
        return;
      }
      if (searchOpen && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) goPrev();
        else goNext();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  // Close nav on outside click
  useEffect(() => {
    if (!navOpen) return;
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target))
        setNavOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [navOpen]);

  // Clear highlights + close search when clicking outside the search bar
  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        clearHighlights();
        setSearchOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  const scrollTo = (id) => {
    const el = sectionRefs[id]?.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setNavOpen(false);
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    findMatches(val);
  };

  const noMatch = query.trim().length > 0 && matchCount === 0;
  const hasQuery = query.trim().length > 0;

  const navBtnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text2)",
    display: "flex",
    alignItems: "center",
    padding: "4px 5px",
    borderRadius: 5,
    transition: "background 0.1s",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "var(--bg, #141414)",
        borderBottom: "1px solid var(--border)",
        padding: "0 48px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 0",
        }}
      >
        {/* ── Search area ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {searchOpen ? (
            <div
              ref={searchBarRef}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flex: 1,
                maxWidth: 540,
                background: "var(--surface2)",
                border: `1px solid ${noMatch ? "#ff3860" : "var(--red)"}`,
                borderRadius: 8,
                padding: "5px 8px 5px 12px",
                boxShadow: `0 0 0 3px ${noMatch ? "color-mix(in srgb, #ff3860, 10%)" : "color-mix(in srgb, var(--red) 10%, transparent)"}`,
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              {/* Search icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text3)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              {/* Input */}
              <input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                placeholder={t("settings.searchPlaceholder")}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: noMatch ? "#ff3860" : "var(--text)",
                  fontFamily: "var(--font-body)",
                  minWidth: 0,
                }}
              />

              {/* Match counter */}
              {hasQuery && (
                <span
                  style={{
                    fontSize: 12,
                    color: noMatch ? "#ff3860" : "var(--text3)",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    padding: "0 8px",
                    borderLeft: "1px solid var(--border)",
                    borderRight: "1px solid var(--border)",
                    margin: "0 2px",
                    flexShrink: 0,
                  }}
                >
                  {noMatch ? t("settings.noMatch") : `${currentMatch} / ${matchCount}`}
                </span>
              )}

              {/* Prev button */}
              {matchCount > 0 && (
                <button
                  onClick={goPrev}
                  title={t("settings.prevMatch")}
                  style={navBtnStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
              )}

              {/* Next button */}
              {matchCount > 0 && (
                <button
                  onClick={goNext}
                  title={t("settings.nextMatch")}
                  style={navBtnStyle}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}

              {/* Divider + Clear */}
              {query && (
                <button
                  onClick={() => {
                    setQuery("");
                    clearHighlights();
                    inputRef.current?.focus();
                  }}
                  title={t("settings.clearSearch")}
                  style={{ ...navBtnStyle, color: "var(--text3)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}

              {/* Esc button */}
              <button
                onClick={closeSearch}
                title={t("settings.closeSearch")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  fontSize: 11,
                  padding: "3px 7px",
                  borderRadius: 4,
                  fontFamily: "var(--font-body)",
                  flexShrink: 0,
                  letterSpacing: 0.3,
                }}
              >
                Esc
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 13,
                color: "var(--text3)",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--surface3)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--surface2)")
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {t("settings.searchSettings")}
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontFamily: "monospace",
                  letterSpacing: 0.5,
                }}
              >
                ⌘K
              </span>
            </button>
          )}
        </div>

        {/* ── Jump to section dropdown ── */}
        <div ref={navRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setNavOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: navOpen ? "var(--surface3)" : "var(--surface2)",
              border: `1px solid ${navOpen ? "var(--red)" : "var(--border)"}`,
              boxShadow: navOpen ? "0 0 0 3px color-mix(in srgb, var(--red) 10%, transparent)" : "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              color: "var(--text)",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "var(--font-body)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <circle cx="3" cy="6" r="1" fill="currentColor" />
              <circle cx="3" cy="12" r="1" fill="currentColor" />
              <circle cx="3" cy="18" r="1" fill="currentColor" />
            </svg>
            {t("settings.jumpToSection")}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text3)"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{
                transform: navOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                flexShrink: 0,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {navOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 200,
                background: "var(--surface3)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
                minWidth: 230,
                padding: 6,
              }}
            >
              {SECTION_NAV.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => scrollTo(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 12px",
                    fontSize: 13,
                    color: "var(--text)",
                    cursor: "pointer",
                    transition: "background 0.1s",
                    fontFamily: "var(--font-body)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.07)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span
                    style={{
                      width: 22,
                      textAlign: "center",
                      fontSize: 13,
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </span>
                  <span style={{ flex: 1 }}>{s.label}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text3)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage({
  apiKey,
  onChangeApiKey,
  initialSection,
}) {
  const t = useTranslate();
  const [downloadPath, setDownloadPath] = useState(
    () => storage.get(STORAGE_KEYS.DOWNLOAD_PATH) || "",
  );
  const [watchedThreshold, setWatchedThreshold] = useState(
    () => storage.get(STORAGE_KEYS.WATCHED_THRESHOLD) ?? 20,
  );
  const [introSkipMode, setIntroSkipMode] = useState(
    () => storage.get(STORAGE_KEYS.INTRO_SKIP_MODE) || "off",
  );
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetHovered, setResetHovered] = useState(false);
  const [showProgressConfirm, setShowProgressConfirm] = useState(false);
  const [showDeleteDlConfirm, setShowDeleteDlConfirm] = useState(false);

  // ── Section refs for navigation ────────────────────────────────────────────
  const secUpdates = useRef(null);
  const secContent = useRef(null);
  const secPlayback = useRef(null);
  const secSubtitles = useRef(null);
  const secDownloads = useRef(null);
  const secNotifications = useRef(null);
  const secInterface = useRef(null);
  const secLibrary = useRef(null);
  const secBackup = useRef(null);
  const secStorage = useRef(null);
  const secAbout = useRef(null);

  const sectionRefs = {
    updates: secUpdates,
    content: secContent,
    playback: secPlayback,
    subtitles: secSubtitles,
    downloads: secDownloads,
    notifications: secNotifications,
    interface: secInterface,
    library: secLibrary,
    backup: secBackup,
    storage: secStorage,
    about: secAbout,
  };

  // Ref for find-in-page search scope
  const contentRef = useRef(null);

  // Scroll to initial section if provided (e.g. when navigating from a modal)
  useEffect(() => {
    if (!initialSection) return;
    const el = sectionRefs[initialSection]?.current;
    if (!el) return;
    // Small delay so layout is complete before scrolling
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(t);
  }, []);

  // Age Rating
  const [ratingCountry, setRatingCountry] = useState(
    () => storage.get(STORAGE_KEYS.RATING_COUNTRY) || "US",
  );
  const [ageLimit, setAgeLimit] = useState(() => {
    const v = storage.get(STORAGE_KEYS.AGE_LIMIT);
    return v === null || v === undefined ? "" : String(v);
  });
  const [ageSaved, setAgeSaved] = useState(false);

  const saveAgeSettings = () => {
    storage.set(STORAGE_KEYS.RATING_COUNTRY, ratingCountry);
    if (ageLimit === "" || ageLimit === null) {
      storage.remove(STORAGE_KEYS.AGE_LIMIT);
    } else {
      storage.set(STORAGE_KEYS.AGE_LIMIT, Number(ageLimit));
    }
    setAgeSaved(true);
    setTimeout(() => setAgeSaved(false), 2000);
  };

  // Invidious
  const [invidiousBase, setInvidiousBase] = useState(
    () => storage.get(STORAGE_KEYS.INVIDIOUS_BASE) || DEFAULT_INVIDIOUS_BASE,
  );
  const [invidiousStatus, setInvidiousStatus] = useState(null); // null | { ok: bool, msg: string }
  const [invidiousChecking, setInvidiousChecking] = useState(false);
  const [invidiousSaved, setInvidiousSaved] = useState(false);

  const checkInvidious = async (baseUrl) => {
    const clean = (baseUrl || "").trim().replace(/\/$/, "");
    if (!clean) {
      setInvidiousStatus({ ok: false, msg: "Please enter a URL first." });
      return;
    }
    setInvidiousChecking(true);
    setInvidiousStatus(null);
    try {
      const url = `${clean}/api/v1/stats`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        setInvidiousStatus({
          ok: true,
          msg: "Instance reachable and responding.",
        });
      } else {
        setInvidiousStatus({
          ok: false,
          msg: `Server responded with status ${res.status}.`,
        });
      }
    } catch (e) {
      setInvidiousStatus({
        ok: false,
        msg: "Could not reach instance. Check the URL or try another.",
      });
    } finally {
      setInvidiousChecking(false);
    }
  };

  const saveInvidiousBase = () => {
    const clean = (invidiousBase || "").trim().replace(/\/$/, "");
    storage.set(STORAGE_KEYS.INVIDIOUS_BASE, clean || DEFAULT_INVIDIOUS_BASE);
    setInvidiousBase(clean || DEFAULT_INVIDIOUS_BASE);
    setInvidiousSaved(true);
    setTimeout(() => setInvidiousSaved(false), 2000);
  };

  // Storage sizes - null = loading, -1 = unavailable, ≥0 = real value
  const [sizes, setSizes] = useState({ cache: null, downloads: null });

  useEffect(() => {
    if (typeof window === "undefined" || !window.electron) {
      setSizes({ cache: -1, downloads: -1 });
      return;
    }
    (async () => {
      try {
        const [cacheRes, downloadsRes] = await Promise.all([
          window.electron.getCacheSize?.() ?? null,
          window.electron.getDownloadsSize?.() ?? null,
        ]);
        setSizes({
          cache: cacheRes?.bytes ?? -1,
          downloads: downloadsRes?.bytes ?? -1,
        });
      } catch {
        setSizes({ cache: -1, downloads: -1 });
      }
    })();
  }, []);

  const pickFolder = async () => {
    if (!isElectron) return;
    const folder = await window.electron.pickFolder();
    if (folder) {
      setDownloadPath(folder);
      storage.set(STORAGE_KEYS.DOWNLOAD_PATH, folder);
      flash();
    }
  };

  const handleSavePath = () => {
    storage.set(STORAGE_KEYS.DOWNLOAD_PATH, downloadPath);
    flash();
  };

  const handleSaveThreshold = () => {
    const val = Math.max(1, Math.min(300, Number(watchedThreshold) || 20));
    setWatchedThreshold(val);
    storage.set(STORAGE_KEYS.WATCHED_THRESHOLD, val);
    flash();
  };

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Clean handlers ─────────────────────────────────────────────────────────

  const handleClearCache = async () => {
    await clearAppCaches();
    setSizes((prev) => ({ ...prev, cache: 0 }));
    return { msg: "✓ Cache cleared successfully" };
  };

  const handleClearWatchProgress = async () => {
    storage.remove(STORAGE_KEYS.WATCH_PROGRESS);
    storage.remove(STORAGE_KEYS.HISTORY);
    storage.remove(STORAGE_KEYS.WATCHED);
    if (isElectron) await window.electron.clearWatchData();
    setTimeout(() => window.location.reload(), 800);
    return { msg: "✓ Watch data cleared" };
  };

  const handleDeleteAllDownloads = async () => {
    let msg = "✓ All downloads removed";
    setSizes((prev) => ({ ...prev, downloads: 0 }));
    if (isElectron) {
      const res = await window.electron.deleteAllDownloads();
      if (res?.deleted != null) {
        msg = `✓ Removed ${res.deleted} file${res.deleted !== 1 ? "s" : ""}`;
        if (res.errors > 0) msg += ` (${res.errors} could not be deleted)`;
      }
    } else {
      storage.remove(STORAGE_KEYS.LOCAL_FILES);
    }
    return { msg };
  };

  const handleResetApp = async () => {
    setShowResetConfirm(false);
    if (isElectron) await window.electron.resetApp();
    storage.clearAll();
    // Clear non-prefixed localStorage caches
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("dlDur_")) localStorage.removeItem(key);
    }
    window.location.reload();
  };

  return (
    <>
      {showProgressConfirm && (
        <ConfirmDialog
          title={t("settings.clearProgressTitle")}
          description={t("settings.clearProgressConfirm")}
          confirmLabel={t("settings.yesClearAll")}
          onConfirm={async () => {
            setShowProgressConfirm(false);
            await handleClearWatchProgress();
            window.__progressConfirmResolve?.({ msg: "✓ Watch data cleared" });
            window.__progressConfirmResolve = null;
          }}
          onCancel={() => {
            setShowProgressConfirm(false);
            window.__progressConfirmResolve?.({ cancelled: true });
            window.__progressConfirmResolve = null;
          }}
        />
      )}
      {showDeleteDlConfirm && (
        <ConfirmDialog
          title={t("settings.deleteDownloadsTitle")}
          description={t("settings.deleteDownloadsConfirm")}
          confirmLabel={t("settings.yesDeleteAll")}
          onConfirm={async () => {
            setShowDeleteDlConfirm(false);
            const result = await handleDeleteAllDownloads();
            window.__deleteDlConfirmResolve?.(result);
            window.__deleteDlConfirmResolve = null;
          }}
          onCancel={() => {
            setShowDeleteDlConfirm(false);
            window.__deleteDlConfirmResolve?.({ cancelled: true });
            window.__deleteDlConfirmResolve = null;
          }}
        />
      )}
      {showResetConfirm && (
        <ResetConfirmDialog
          onConfirm={handleResetApp}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* ── Sticky search & navigation bar ── */}
      <SettingsTopBar sectionRefs={sectionRefs} contentRef={contentRef} />

      <div
        ref={contentRef}
        className="fade-in"
        style={{ padding: "40px 48px 80px" }}
      >
        {/* Page title */}
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          {t("settings.title")}
        </div>
        <div style={{ color: "var(--text3)", fontSize: 14, marginBottom: 48 }}>
          {t("app.config")}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: GENERAL                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secUpdates} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.general")}
            subtitle={t("settings.generalDesc")}
          />

          {/* Version & Updates */}
          <VersionSection />

          <Divider />

          {/* TMDB API Token */}
          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">{t("settings.tmdbToken")}</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {t("settings.tmdbTokenDesc")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <code
                style={{
                  fontSize: 13,
                  color: "var(--text2)",
                  background: "var(--surface2)",
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                }}
              >
                {apiKey ? apiKey.slice(0, 8) + "••••••••••••••••" : t("settings.tmdbNotSet")}
              </code>
              <button className="btn btn-ghost" onClick={onChangeApiKey}>
                {t("settings.changeToken")}
              </button>
            </div>
          </div>

          <Divider />

          {/* TMDB Proxy / Mirror */}
          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">TMDB Proxy</div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
              If api.themoviedb.org is blocked in your region, enter a proxy/mirror URL here. Leave empty to use the default.
            </div>
            <input
              className="apikey-input"
              type="text"
              placeholder="https://api.themoviedb.org/3"
              defaultValue={(() => { try { const r = localStorage.getItem("sinex_tmdbBase"); return r ? JSON.parse(r) : ""; } catch { return ""; } })()}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) localStorage.setItem("sinex_tmdbBase", JSON.stringify(val));
                else localStorage.removeItem("sinex_tmdbBase");
              }}
              style={{ width: "100%", maxWidth: 500 }}
            />
            <div style={{ fontSize: 12, color: "var(--text4)", marginTop: 6 }}>
              Restart the app after changing this.
            </div>
          </div>

          <Divider />

          <LanguageSection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: CONTENT                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secContent} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.content")}
            subtitle={t("settings.contentDesc")}
          />

          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">
              {t("settings.ageRating")}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              {t("settings.ageRatingDesc")}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text2)",
                    marginBottom: 8,
                  }}
                >
                  {t("settings.ratingCountry")}
                </div>
                <SettingsSelect
                  value={ratingCountry}
                  onChange={(v) => setRatingCountry(v)}
                  options={RATING_COUNTRIES.map((c) => ({
                    value: c.code,
                    label: c.label,
                  }))}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text2)",
                    marginBottom: 8,
                  }}
                >
                  {t("settings.maxAgeRating")}
                </div>
                <SettingsSelect
                  value={ageLimit}
                  onChange={(v) => setAgeLimit(v)}
                  options={getAgeLimitOptions(t)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="btn btn-primary" onClick={saveAgeSettings}>
                  {t("common.save")}
                </button>
                {ageSaved && (
                  <span style={{ fontSize: 13, color: "#48c774" }}>
                    {t("common.saved")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: PLAYBACK                                                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secPlayback} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.playback")}
            subtitle={t("settings.playbackDesc")}
          />

          {/* Invidious */}
          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">{t("settings.invidious")}</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {t("settings.invidiousDesc")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="apikey-input"
                style={{ flex: 1, minWidth: 260, marginBottom: 0 }}
                placeholder={DEFAULT_INVIDIOUS_BASE}
                value={invidiousBase}
                onChange={(e) => {
                  setInvidiousBase(e.target.value);
                  setInvidiousStatus(null);
                }}
              />
              <button
                className="btn btn-ghost"
                disabled={invidiousChecking}
                onClick={() => checkInvidious(invidiousBase)}
                style={{ opacity: invidiousChecking ? 0.5 : 1 }}
              >
                {invidiousChecking ? t("settings.checking") : t("settings.invidiousCheck")}
              </button>
              <button className="btn btn-primary" onClick={saveInvidiousBase}>
                {t("common.save")}
              </button>
            </div>

            {invidiousStatus && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: invidiousStatus.ok ? "#48c774" : "#ff3860",
                    boxShadow: invidiousStatus.ok
                      ? "0 0 6px rgba(72,199,116,0.6)"
                      : "0 0 6px rgba(255,56,96,0.6)",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: invidiousStatus.ok ? "#48c774" : "#ff3860",
                  }}
                >
                  {invidiousStatus.msg}
                </span>
              </div>
            )}

            {invidiousSaved && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#48c774" }}>
                {t("common.saved")}
              </div>
            )}
          </div>

          <Divider />

          {/* Auto-Watched Threshold */}
          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">{t("settings.autoWatched")}</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {t("settings.autoWatchedDesc")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  max={300}
                  className="apikey-input"
                  style={{ width: 90, marginBottom: 0 }}
                  value={watchedThreshold}
                  onChange={(e) => setWatchedThreshold(e.target.value)}
                />
                <span style={{ fontSize: 14, color: "var(--text2)" }}>
                  {t("settings.seconds")}
                </span>
              </div>
              <button className="btn btn-primary" onClick={handleSaveThreshold}>
                {t("common.save")}
              </button>
            </div>
            {saved && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#48c774" }}>
                {t("common.saved")}
              </div>
            )}
          </div>

          {/* Intro Skip */}
          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">{t("settings.introSkip")}</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {t("settings.introSkipDesc")}
            </div>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0 16px",
              }}
            >
              {[
                {
                  value: "off",
                  label: t("settings.introSkipOff"),
                  desc: t("settings.introSkipOffDesc"),
                },
                {
                  value: "auto",
                  label: t("settings.introSkipAuto"),
                  desc: t("settings.introSkipAutoDesc"),
                },
                {
                  value: "manual",
                  label: t("settings.introSkipManual"),
                  desc: t("settings.introSkipManualDesc"),
                },
              ].map(({ value, label, desc }, i, arr) => (
                <div
                  key={value}
                  onClick={() => {
                    setIntroSkipMode(value);
                    storage.set(STORAGE_KEYS.INTRO_SKIP_MODE, value);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "16px 0",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                  }}
                >
                  {/* Radio dot */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${introSkipMode === value ? "var(--red)" : "var(--border)"}`,
                      background:
                        introSkipMode === value ? "var(--red)" : "transparent",
                      flexShrink: 0,
                      marginTop: 1,
                      boxShadow:
                        introSkipMode === value
                          ? "0 0 0 3px color-mix(in srgb, var(--red) 18%, transparent)"
                          : "none",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {introSkipMode === value && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#fff",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text)",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text3)",
                        marginTop: 3,
                        lineHeight: 1.5,
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: SUBTITLES                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secSubtitles} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.subtitles")}
            subtitle={t("settings.subtitlesDesc")}
          />
          <SubtitleSettingsSection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: DOWNLOADS                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secDownloads} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.downloads")}
            subtitle={t("settings.downloadsDesc")}
          />

          <div style={{ marginBottom: 40 }}>
            <div className="settings-section-title">{t("settings.downloadFolder")}</div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text3)",
                marginBottom: 16,
                lineHeight: 1.6,
              }}
            >
              {t("settings.downloadFolderDesc")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                className="apikey-input"
                style={{ flex: 1, minWidth: 260, marginBottom: 0 }}
                placeholder={t("settings.downloadFolderPlaceholder")}
                value={downloadPath}
                onChange={(e) => setDownloadPath(e.target.value)}
              />
              {isElectron && (
                <button className="btn btn-secondary" onClick={pickFolder}>
                  {t("settings.browse")}
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSavePath}>
                {t("common.save")}
              </button>
            </div>
            {saved && (
              <div style={{ marginTop: 10, fontSize: 13, color: "#4caf50" }}>
                {t("common.saved")}
              </div>
            )}
            {!downloadPath && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--red)" }}>
                {t("settings.noFolderWarning")}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: NOTIFICATIONS                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secNotifications} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.notifications")}
            subtitle={t("settings.notificationsDesc")}
          />
          <NotificationsSection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: INTERFACE                                                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secInterface} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.interface")}
            subtitle={t("settings.interfaceDesc")}
          />
          <ThemeSection />
          <Divider />
          <HomeLayoutSection />
          <Divider />
          <StartPageSection />
          <Divider />
          <AppearanceSection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: LIBRARY                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secLibrary} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.library")}
            subtitle={t("settings.libraryDesc")}
          />
          <LibraryPrivacySection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: BACKUP                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secBackup} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.backupRestore")}
            subtitle={t("settings.backupRestoreDesc")}
          />
          <BackupRestoreSection />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: STORAGE & DATA                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secStorage} style={{ scrollMarginTop: 80 }}>
          <SectionGroupHeader
            title={t("settings.storage")}
            subtitle={t("settings.storageDesc")}
          />

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {/* Install location */}
            <div style={{ padding: "22px 24px" }}>
              <CleanRow
                title={t("settings.installLocation")}
                description={t("settings.installLocationDesc")}
                buttonLabel={t("settings.openFolder")}
                onAction={async () => {
                  const p = await window.electron?.getInstallPath?.();
                  if (p) window.electron.openPath(p);
                }}
              />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Cache */}
            <div style={{ padding: "22px 24px" }}>
              <CleanRow
                title={t("settings.clearCache")}
                description={t("settings.clearCacheDesc")}
                buttonLabel={t("settings.clearCache")}
                onAction={handleClearCache}
                sizeLabel={formatBytes(sizes.cache)}
              />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Watch Progress */}
            <div style={{ padding: "22px 24px" }}>
              <CleanRow
                title={t("settings.clearProgress")}
                description={t("settings.clearProgressDesc")}
                buttonLabel={t("settings.clearProgress")}
                onAction={() =>
                  new Promise((resolve) => {
                    setShowProgressConfirm(true);
                    window.__progressConfirmResolve = resolve;
                  })
                }
                danger
              />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Delete Downloads */}
            <div style={{ padding: "22px 24px" }}>
              <CleanRow
                title={t("settings.deleteDownloads")}
                description={t("settings.deleteDownloadsDesc")}
                buttonLabel={t("settings.deleteDownloads")}
                onAction={() =>
                  new Promise((resolve) => {
                    setShowDeleteDlConfirm(true);
                    window.__deleteDlConfirmResolve = resolve;
                  })
                }
                sizeLabel={formatBytes(sizes.downloads)}
                danger
              />
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Full Reset */}
            <div
              style={{
                padding: "22px 24px",
                background: "color-mix(in srgb, var(--red) 3%, transparent)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 24,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {t("settings.resetApp")}
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: "var(--red)",
                        background: "color-mix(in srgb, var(--red) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--red) 25%, transparent)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        textTransform: "uppercase",
                      }}
                    >
                      {t("settings.irreversible")}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      lineHeight: 1.6,
                    }}
                  >
                    {t("settings.resetAppDesc")}
                  </div>
                </div>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                    <button
                      className="btn"
                      onClick={() => setShowResetConfirm(true)}
                      onMouseEnter={() => setResetHovered(true)}
                      onMouseLeave={() => setResetHovered(false)}
                      style={{
                        color: resetHovered ? "#fff" : "var(--red)",
                        background: resetHovered
                          ? "color-mix(in srgb, var(--red) 85%, transparent)"
                          : "color-mix(in srgb, var(--red) 8%, transparent)",
                        border: resetHovered
                          ? "1px solid transparent"
                          : "1px solid color-mix(in srgb, var(--red) 30%, transparent)",
                        transition: "all 0.2s",
                      }}
                    >
                    {t("settings.resetApp")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GROUP: DEVELOPER ERROR DEBUG                                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div style={{ scrollMarginTop: 80, marginTop: 48 }}>
          <DeveloperErrorDebug />
        </div>

        {/* GROUP: ABOUT                                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={secAbout} style={{ scrollMarginTop: 80, marginTop: 48 }}>
          <AboutSection />
        </div>
      </div>
    </>
  );
}
