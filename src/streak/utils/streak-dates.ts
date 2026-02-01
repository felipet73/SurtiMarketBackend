const TZ = 'America/Guayaquil';

export function getLocalISODate(date = new Date(), timeZone = TZ): string {
  // "en-CA" => YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function isoToUtcDate(iso: string): Date {
  // iso "YYYY-MM-DD" => Date en UTC midnight
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDaysIso(iso: string, delta: number): string {
  const dt = isoToUtcDate(iso);
  dt.setUTCDate(dt.getUTCDate() + delta);
  return getISOFromUtc(dt);
}

export function getISOFromUtc(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Semana inicia DOMINGO.
// Devuelve el ISO del domingo de la semana del "iso" dado.
export function getWeekStartSunday(iso: string): string {
  const dt = isoToUtcDate(iso);
  const dow = dt.getUTCDay(); // 0=domingo
  dt.setUTCDate(dt.getUTCDate() - dow);
  return getISOFromUtc(dt);
}

export function getWeekDaysSundayStart(todayIso: string): string[] {
  const start = getWeekStartSunday(todayIso);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}