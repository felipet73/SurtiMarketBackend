const TZ = 'America/Guayaquil';

type DateParts = {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0=Sunday
};

function getDatePartsInTZ(date: Date, timeZone: string): DateParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return {
    year,
    month,
    day,
    dayOfWeek: utcDate.getUTCDay(),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function getWeekAndDateKey(date = new Date(), timeZone = TZ) {
  const parts = getDatePartsInTZ(date, timeZone);
  const dateKey = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;

  const dateUTC = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const startOfWeek = new Date(dateUTC);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay());

  const weekYear = startOfWeek.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const yearStartSunday = new Date(yearStart);
  yearStartSunday.setUTCDate(yearStartSunday.getUTCDate() - yearStartSunday.getUTCDay());

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.floor((startOfWeek.getTime() - yearStartSunday.getTime()) / msPerWeek) + 1;
  const weekKey = `${weekYear}-W${pad2(weekNum)}`;

  return {
    weekKey,
    dateKey,
    dayOfWeek: parts.dayOfWeek,
    timeZone,
  };
}
