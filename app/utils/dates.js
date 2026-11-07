// Format a Date as YYYY-MM-DD in the device's local time.
// Never use toISOString() for calendar dates — it converts to UTC, which shifts
// dates back a day in Namibia (UTC+2) for anything between 00:00 and 02:00
// (e.g. local midnight on 1 Nov becomes "2026-10-31").
export const toLocalISODate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
