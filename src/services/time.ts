// Timezone utilities — all conversions via IANA tz database (Intl), independently unit-tested.

/** Offset of `tz` at instant `date`, in minutes east of UTC. */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** UTC instant of local midnight starting the given calendar day in `tz`. DST-safe. */
export function zonedDayStartUTC(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 12);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let start = Date.UTC(y, m - 1, d) - off * 60000;
  const off2 = tzOffsetMinutes(new Date(start), tz);
  if (off2 !== off) start = Date.UTC(y, m - 1, d) - off2 * 60000;
  return new Date(start);
}

/** 'YYYY-MM-DD' of an instant as seen in `tz`. */
export function dateStrInTZ(date: Date, tz: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return dtf.format(date);
}

export function fmtTime(date: Date, tz: string, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: lang === 'en',
  }).format(date);
}

export function fmtDate(date: Date, tz: string, lang: string, style: 'short' | 'long' = 'short'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: tz, day: 'numeric', month: style === 'long' ? 'long' : 'short', year: 'numeric',
  }).format(date);
}

export function fmtDateTime(date: Date, tz: string, lang: string): string {
  return `${fmtDate(date, tz, lang)} · ${fmtTime(date, tz, lang)}`;
}

export function tzLabel(tz: string): string {
  return tz === 'UTC' ? 'UTC' : tz.split('/').pop()!.replace(/_/g, ' ');
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/** 'YYYY-MM-DDTHH:mm' for <input type="datetime-local"> in a given tz. */
export function toLocalInput(date: Date, tz: string): string {
  const off = tzOffsetMinutes(date, tz);
  return new Date(date.getTime() + off * 60000).toISOString().slice(0, 16);
}

/** Parse a datetime-local input value as wall time in `tz`, returning the UTC instant. */
export function fromLocalInput(value: string, tz: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = tzOffsetMinutes(new Date(guess), tz);
  let ts = guess - off * 60000;
  const off2 = tzOffsetMinutes(new Date(ts), tz);
  if (off2 !== off) ts = guess - off2 * 60000;
  return new Date(ts);
}