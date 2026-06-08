// Namibian public holidays + working-day utilities
// Working week: Monday–Saturday. Sundays and public holidays are days off.

// ── Easter (Meeus/Jones/Butcher, valid 1900–2099) ──────────────────────────────
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Fixed annual holidays (month is 1-based) ──────────────────────────────────
const FIXED_HOLIDAYS = [
  { month: 1,  day: 1,  name: "New Year's Day" },
  { month: 3,  day: 21, name: 'Independence Day' },
  { month: 5,  day: 1,  name: "Workers' Day" },
  { month: 5,  day: 4,  name: 'Cassinga Day' },
  { month: 5,  day: 25, name: 'Africa Day' },
  { month: 8,  day: 26, name: "Heroes' Day" },
  { month: 12, day: 10, name: 'Human Rights Day' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 26, name: 'Family Day' },
];

// ── Variable (Easter-based) holidays for a given year ─────────────────────────
function variableHolidays(year) {
  const easter = easterSunday(year);
  const offset = (days) => {
    const d = new Date(easter);
    d.setDate(easter.getDate() + days);
    return d;
  };
  return [
    { date: offset(-2), name: 'Good Friday' },
    { date: offset(1),  name: 'Easter Monday' },
    { date: offset(39), name: 'Ascension Day' },
  ];
}

// ── Public-holiday check ───────────────────────────────────────────────────────

/**
 * Returns { isHoliday: boolean, name: string | null }.
 */
export function isNamibiaPublicHoliday(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  const fixed = FIXED_HOLIDAYS.find((h) => h.month === m && h.day === d);
  if (fixed) return { isHoliday: true, name: fixed.name };

  const variable = variableHolidays(y).find(
    (h) => h.date.getFullYear() === y && h.date.getMonth() + 1 === m && h.date.getDate() === d,
  );
  if (variable) return { isHoliday: true, name: variable.name };

  return { isHoliday: false, name: null };
}

// ── Day-off info for a date ────────────────────────────────────────────────────

/**
 * Returns { isOff: boolean, reason: 'sunday' | 'holiday' | null, name: string | null }.
 * Pass { offSundays, offPublicHolidays } to match per-agreement work schedule.
 */
export function getDayOffInfo(date, { offSundays = true, offPublicHolidays = true } = {}) {
  if (offSundays && date.getDay() === 0) {
    return { isOff: true, reason: 'sunday', name: 'Sunday' };
  }
  if (offPublicHolidays) {
    const { isHoliday, name } = isNamibiaPublicHoliday(date);
    if (isHoliday) return { isOff: true, reason: 'holiday', name };
  }
  return { isOff: false, reason: null, name: null };
}

// ── Working-days counter ───────────────────────────────────────────────────────

/**
 * Count working days between startDate and endDate (both inclusive).
 * Pass { offSundays, offPublicHolidays } to match per-agreement work schedule.
 */
export function getWorkingDays(startDate, endDate, { offSundays = true, offPublicHolidays = true } = {}) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dow = curr.getDay();
    const isSunday = dow === 0;
    if (offSundays && isSunday) { curr.setDate(curr.getDate() + 1); continue; }
    if (offPublicHolidays) {
      const { isHoliday } = isNamibiaPublicHoliday(curr);
      if (!isHoliday) count++;
    } else {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}
