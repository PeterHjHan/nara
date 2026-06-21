import { describe, it, expect } from 'vitest';
import { getDateRange } from '../cron-dates';

// Helper: build a UTC Date that corresponds to a given KST datetime
// e.g. kst(2026, 6, 22, 8, 0) = Monday 08:00 KST = Sunday 23:00 UTC
function kst(year: number, month: number, day: number, hour: number, minute = 0): Date {
  // month is 1-based
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - 9 * 60 * 60 * 1000;
  return new Date(utcMs);
}

// ── Morning run: Tue-Fri ──────────────────────────────────────────────────────

describe('morning run — Tuesday (2026-06-23)', () => {
  // Tuesday KST 08:00
  const result = getDateRange(kst(2026, 6, 23, 8, 0));

  it('is marked as morning', () => expect(result.isMorning).toBe(true));
  it('todayStr is Tuesday', () => expect(result.todayStr).toBe('20260623'));
  it('start is Monday 15:01', () => expect(result.inqryBgnDt).toBe('202606221501'));
  it('end is Tuesday 08:00', () => expect(result.inqryEndDt).toBe('202606230800'));
});

describe('morning run — Wednesday (2026-06-24)', () => {
  const result = getDateRange(kst(2026, 6, 24, 8, 0));

  it('is marked as morning', () => expect(result.isMorning).toBe(true));
  it('start is Tuesday 15:01', () => expect(result.inqryBgnDt).toBe('202606231501'));
  it('end is Wednesday 08:00', () => expect(result.inqryEndDt).toBe('202606240800'));
});

describe('morning run — Thursday (2026-06-25)', () => {
  const result = getDateRange(kst(2026, 6, 25, 8, 0));

  it('start is Wednesday 15:01', () => expect(result.inqryBgnDt).toBe('202606241501'));
  it('end is Thursday 08:00', () => expect(result.inqryEndDt).toBe('202606250800'));
});

describe('morning run — Friday (2026-06-26)', () => {
  const result = getDateRange(kst(2026, 6, 26, 8, 0));

  it('start is Thursday 15:01', () => expect(result.inqryBgnDt).toBe('202606251501'));
  it('end is Friday 08:00', () => expect(result.inqryEndDt).toBe('202606260800'));
});

// ── Monday morning: reaches back to Friday ────────────────────────────────────

describe('morning run — Monday (2026-06-22)', () => {
  const result = getDateRange(kst(2026, 6, 22, 8, 0));

  it('is marked as morning', () => expect(result.isMorning).toBe(true));
  it('todayStr is Monday', () => expect(result.todayStr).toBe('20260622'));
  it('start is Friday 15:01 (3 days back)', () => expect(result.inqryBgnDt).toBe('202606191501'));
  it('end is Monday 08:00', () => expect(result.inqryEndDt).toBe('202606220800'));
});

// ── Afternoon run ─────────────────────────────────────────────────────────────

describe('afternoon run — Tuesday (2026-06-23)', () => {
  const result = getDateRange(kst(2026, 6, 23, 15, 0));

  it('is NOT morning', () => expect(result.isMorning).toBe(false));
  it('todayStr is Tuesday', () => expect(result.todayStr).toBe('20260623'));
  it('start is today 08:01', () => expect(result.inqryBgnDt).toBe('202606230801'));
  it('end is today 15:00', () => expect(result.inqryEndDt).toBe('202606231500'));
});

describe('afternoon run — Monday (2026-06-22)', () => {
  const result = getDateRange(kst(2026, 6, 22, 15, 0));

  it('is NOT morning', () => expect(result.isMorning).toBe(false));
  it('start is today 08:01 — no weekend lookback for afternoon', () => expect(result.inqryBgnDt).toBe('202606220801'));
  it('end is today 15:00', () => expect(result.inqryEndDt).toBe('202606221500'));
});

// ── No overlap between morning end and afternoon start ────────────────────────

describe('no overlap between morning and afternoon on same day', () => {
  const morning   = getDateRange(kst(2026, 6, 23, 8, 0));
  const afternoon = getDateRange(kst(2026, 6, 23, 15, 0));

  it('morning ends at 08:00', () => expect(morning.inqryEndDt.slice(-4)).toBe('0800'));
  it('afternoon starts at 08:01', () => expect(afternoon.inqryBgnDt.slice(-4)).toBe('0801'));
  it('no gap or overlap', () => {
    // morning end hhmm < afternoon start hhmm
    expect(Number(morning.inqryEndDt.slice(-4))).toBeLessThan(Number(afternoon.inqryBgnDt.slice(-4)));
  });
});

// ── Morning end matches afternoon start on same date ─────────────────────────

describe('date consistency: morning end date === afternoon start date', () => {
  const morning   = getDateRange(kst(2026, 6, 24, 8, 0));   // Wednesday morning
  const afternoon = getDateRange(kst(2026, 6, 24, 15, 0));  // Wednesday afternoon

  it('both have same todayStr', () => expect(morning.todayStr).toBe(afternoon.todayStr));
  it('morning end date portion matches today', () => expect(morning.inqryEndDt.slice(0, 8)).toBe(morning.todayStr));
  it('afternoon start date portion matches today', () => expect(afternoon.inqryBgnDt.slice(0, 8)).toBe(afternoon.todayStr));
});

// ── Monday reach-back: no Saturday/Sunday in range ───────────────────────────

describe('Monday morning range spans Friday→Monday only', () => {
  const result = getDateRange(kst(2026, 6, 22, 8, 0));
  const bgnDate = result.inqryBgnDt.slice(0, 8); // YYYYMMDD of start
  const endDate = result.inqryEndDt.slice(0, 8); // YYYYMMDD of end

  it('start is a Friday (20260619)', () => expect(bgnDate).toBe('20260619'));
  it('end is a Monday (20260622)', () => expect(endDate).toBe('20260622'));
  it('diff is exactly 3 days', () => {
    const start = new Date(`${bgnDate.slice(0,4)}-${bgnDate.slice(4,6)}-${bgnDate.slice(6,8)}`);
    const end   = new Date(`${endDate.slice(0,4)}-${endDate.slice(4,6)}-${endDate.slice(6,8)}`);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(3);
  });
});
