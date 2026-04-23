import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const STORAGE_KEY = "dclic_mode";

export const FORCED_IPAD_PREFIXES = ["/signer/", "/suivi/", "/ipad"];

export const isForcedIpadPath = (pathname) =>
  FORCED_IPAD_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

export function detectAuto() {
  if (typeof window === "undefined") return "pc";
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isNarrow = window.innerWidth <= 1024;
  const isTabletUA = /iPad|Android(?!.*Mobile)|Tablet/i.test(navigator.userAgent || "");
  return isTouch && (isNarrow || isTabletUA) ? "ipad" : "pc";
}

export function useDeviceMode() {
  const location = useLocation();
  const [override, setOverride] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [auto, setAuto] = useState(detectAuto);

  useEffect(() => {
    const onResize = () => setAuto(detectAuto());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const forced = isForcedIpadPath(location.pathname);
  const mode = forced ? "ipad" : override || auto;

  const setMode = (value) => {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setOverride(value || null);
  };

  return { mode, forced, override, setMode };
}
