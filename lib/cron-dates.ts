export interface DateRange {
  inqryBgnDt: string; // YYYYMMDDHHMM
  inqryEndDt: string;
  isMorning: boolean;
  todayStr: string;   // YYYYMMDD
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/**
 * Given a UTC Date, computes the KST-based search window for the cron run.
 *
 * Morning run  (KST ~08:00, kstHour < 12):
 *   Mon → Friday 15:01 → Monday 08:00
 *   Tue-Fri → yesterday 15:01 → today 08:00
 *
 * Afternoon run (KST ~15:00, kstHour >= 12):
 *   Any → today 08:01 → today 15:00
 */
export function getDateRange(nowUtc: Date): DateRange {
  const kst     = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const kstHour = kst.getUTCHours();
  const kstDay  = kst.getUTCDay(); // 0=Sun 1=Mon … 5=Fri 6=Sat
  const isMorning = kstHour < 12;
  const todayStr  = ymd(kst);

  let inqryBgnDt: string;
  const inqryEndDt: string = isMorning
    ? todayStr + '0800'
    : todayStr + '1500';

  if (isMorning) {
    const daysBack = kstDay === 1 ? 3 : 1; // Monday → go back 3 days to Friday
    const prevDay  = addDays(kst, -daysBack);
    inqryBgnDt = ymd(prevDay) + '1501';
  } else {
    inqryBgnDt = todayStr + '0801';
  }

  return { inqryBgnDt, inqryEndDt, isMorning, todayStr };
}
