/**
 * Format helpers for French dates (jj/mm/aaaa).
 */

/** "2026-04-27T13:42:00..." -> "27/04/2026" */
export function formatDateFR(input) {
  if (!input) return "";
  // Si déjà au format jj/mm/aaaa, on retourne tel quel
  if (typeof input === "string" && /^\d{2}\/\d{2}\/\d{4}/.test(input)) return input.slice(0, 10);
  // Si format ISO ou Date
  const s = typeof input === "string" ? input : input?.toISOString?.() || "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // Fallback via Intl
  try {
    const d = new Date(input);
    if (!isNaN(d)) {
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  } catch {}
  return String(input).slice(0, 10);
}

/** "2026-04-27T13:42:00..." -> "27/04/2026 13:42" */
export function formatDateTimeFR(input) {
  if (!input) return "";
  try {
    const d = new Date(input);
    if (!isNaN(d)) {
      return d.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    }
  } catch {}
  return formatDateFR(input);
}
