import { useState, useEffect, useRef } from "react";
import welcomeSound from "./Welcome.mp3";
import { useTranslate } from "../utils/i18n";

const BG_COLORS = ["#1a1a1a", "#e50914", "#f7f7f7", "#1a1a1a"];
const TOTAL_DURATION = 5500;
const BG_INTERVAL = 1000;
const PROGRESS_DELAY = 400;

export default function WelcomeScreen({ onDone }) {
  const t = useTranslate();
  const [bgIndex, setBgIndex] = useState(0);
  const [phase, setPhase] = useState("enter"); // enter | hold | exit
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t0 = startRef.current;

    // Background cycling: every 1s advance to next color
    const bgTimer = setInterval(() => {
      setBgIndex((i) => Math.min(i + 1, BG_COLORS.length - 1));
    }, BG_INTERVAL);

    // Text enter animation for 2.5s, then hold, then exit at ~4s
    const enterTimer = setTimeout(() => setPhase("hold"), 2500);
    const exitTimer = setTimeout(() => setPhase("exit"), 4000);

    // Fade out after TOTAL_DURATION
    const doneTimer = setTimeout(() => onDone(), TOTAL_DURATION);

    return () => {
      clearInterval(bgTimer);
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const bg = BG_COLORS[bgIndex];
  const isLight = bgIndex === 2; // #f7f7f7 is light
  const logoClass = isLight ? "welcome-logo welcome-logo--light" : "welcome-logo welcome-logo--dark";
  const progressWrapClass = isLight ? "welcome-progress-wrap welcome-progress-wrap--light" : "welcome-progress-wrap";
  const progressBarClass = "welcome-progress-bar" + (isLight ? " welcome-progress-bar--light" : "");

  const textAnim =
    phase === "enter"
      ? "tracking-in-contract-bck"
      : phase === "exit"
        ? "blur-out-contract"
        : "";

  return (
    <div
      className={`welcome-screen${phase === "exit" ? " welcome-screen--exit" : ""}`}
      style={{ backgroundColor: bg }}
    >
      <audio src={welcomeSound} autoPlay />
      <div className={`${logoClass} ${textAnim}`}>{t("app.name")}</div>
      <div className={progressWrapClass}>
        <div className={progressBarClass} />
      </div>
    </div>
  );
}