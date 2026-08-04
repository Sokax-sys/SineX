import { useState, useEffect, useRef } from "react";
import { SineXLogo, PlayIcon } from "./Icons";
import { useTranslate } from "../utils/i18n";
import { tmdbFetch } from "../utils/api";

async function validateToken(token) {
  try {
    await tmdbFetch("/configuration", token, {
      noLang: true,
      signal: AbortSignal.timeout(7000),
    });
    await tmdbFetch("/trending/movie/week", token, {
      signal: AbortSignal.timeout(7000),
    });
    return { ok: true };
  } catch (err) {
    if (err?.message === "TMDB unreachable") {
      return { ok: false, reason: "unreachable" };
    }
    if (err?.message === "TMDB 401" || err?.message === "TMDB 403") {
      return { ok: false, reason: "invalid_token" };
    }
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unreachable" };
  }
}

function errorMessage(reason, status, t) {
  const key = "setup.error" + reason.charAt(0).toUpperCase() + reason.slice(1);
  return {
    title: t(key),
    body: t(key + "Desc", { status: status ? ` (HTTP ${status})` : "" }),
  };
}

function ExternalLink({ href, className, children }) {
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        window.electron.openExternal(href);
      }}
    >
      {children}
    </a>
  );
}

export default function SetupScreen({ onSave, onSkip }) {
  const t = useTranslate();
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null); // { title, body }
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      window.focus();
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async () => {
    const token = key.trim();
    if (!token) return;
    setChecking(true);
    setError(null);
    const result = await validateToken(token);
    setChecking(false);
    if (result.ok) {
      onSave(token);
    } else {
      setError(errorMessage(result.reason, result.status, t));
    }
  };

  return (
    <div className="apikey-modal">
      <div className="apikey-box">
        <div className="apikey-logo">
          <SineXLogo />
        </div>
        <div className="apikey-title">{t("setup.title")}</div>
        <p className="apikey-sub">
          {t("setup.subtitle")}
          <br />
          {t("setup.description")}
        </p>
        <input
          className={`apikey-input${error ? " apikey-input-error" : ""}`}
          placeholder={t("setup.placeholder")}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !checking && handleSubmit()}
          ref={inputRef}
          disabled={checking}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            borderColor: error ? "#f44336" : focused ? "var(--red)" : undefined,
          }}
        />

        {error && (
          <div className="apikey-error-box">
            <div className="apikey-error-title">⚠ {error.title}</div>
            <div className="apikey-error-body">{error.body}</div>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "13px",
            marginTop: error ? 0 : undefined,
          }}
          onClick={handleSubmit}
          disabled={!key.trim() || checking}
        >
          {checking ? (
            <>
              <span className="apikey-spinner" /> {t("setup.checking")}
            </>
          ) : (
            <>
              <PlayIcon /> {t("setup.letsGo")}
            </>
          )}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              marginTop: 14,
              background: "none",
              border: "none",
              color: "var(--text3)",
              fontSize: 13,
              cursor: "pointer",
              padding: "6px 0",
              width: "100%",
              textAlign: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
          >
            {t("setup.skip")}
          </button>
        )}
      </div>
    </div>
  );
}
