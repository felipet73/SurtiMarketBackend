export function getISOWeekRange(date = new Date()) {
  // Devuelve [start, end) en UTC para la semana ISO actual
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // 1..7 (lunes..domingo)
  d.setUTCDate(d.getUTCDate() + 1 - day); // lunes 00:00 UTC
  const start = new Date(d);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 7);
  return { start, end };
}