import { Timestamp, collection, getDocs, orderBy, query, where } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { Entry } from "../types";

export interface AttendanceSummary {
  monthPercent: number;
  yearPercent: number;
  presentMonth: number;
  presentYear: number;
  expectedMonth: number;
  expectedYear: number;
  holidayMonthCount: number;
  holidayYearCount: number;
  holidayMonthDates: string[];
  holidayYearDates: string[];
}

export interface ChileHoliday {
  date: string;
  name: string;
}

const holidayCache = new Map<number, Set<string>>();
const holidayItemCache = new Map<number, ChileHoliday[]>();
const HOLIDAY_CACHE_PREFIX = "attendance:holidays:cl:";
const HOLIDAY_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const GENERIC_HOLIDAY_NAME = "Feriado nacional";

function hasOnlyGenericHolidayNames(items: ChileHoliday[]): boolean {
  if (items.length === 0) return true;
  return items.every((item) => item.name.trim().toLowerCase() === GENERIC_HOLIDAY_NAME.toLowerCase());
}

function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function countBusinessDays(start: Date, end: Date, holidays: Set<string>): number {
  if (end < start) return 0;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let total = 0;
  while (cursor <= limit) {
    const iso = toISODateLocal(cursor);
    if (isWeekday(cursor) && !holidays.has(iso)) total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

function listBusinessHolidayDates(start: Date, end: Date, holidays: Set<string>): string[] {
  if (end < start) return [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out: string[] = [];
  while (cursor <= limit) {
    const iso = toISODateLocal(cursor);
    if (isWeekday(cursor) && holidays.has(iso)) out.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function extractHolidayItems(payload: any): ChileHoliday[] {
  const candidates: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.holidays)
        ? payload.holidays
        : [];

  const items = candidates
    .map((item): ChileHoliday | null => {
      if (typeof item === "string") {
        return /^\d{4}-\d{2}-\d{2}$/.test(item)
          ? { date: item, name: "Feriado nacional" }
          : null;
      }

      const date =
        typeof item?.date === "string" ? item.date :
        typeof item?.fecha === "string" ? item.fecha :
        null;
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

      const name =
        (typeof item?.name === "string" && item.name.trim()) ||
        (typeof item?.nombre === "string" && item.nombre.trim()) ||
        (typeof item?.title === "string" && item.title.trim()) ||
        (typeof item?.glosa === "string" && item.glosa.trim()) ||
        "Feriado nacional";

      return { date, name };
    })
    .filter((item): item is ChileHoliday => Boolean(item));

  const uniqueByDate = new Map<string, ChileHoliday>();
  for (const item of items) {
    if (!uniqueByDate.has(item.date)) uniqueByDate.set(item.date, item);
  }
  return [...uniqueByDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchChileHolidays(year: number): Promise<Set<string>> {
  if (holidayCache.has(year)) return holidayCache.get(year)!;

  const storageKey = `${HOLIDAY_CACHE_PREFIX}${year}`;
  try {
    const cached = await AsyncStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        fetchedAt?: number;
        dates?: string[];
        items?: ChileHoliday[];
      };
      if (
        typeof parsed?.fetchedAt === "number" &&
        Date.now() - parsed.fetchedAt < HOLIDAY_CACHE_TTL_MS
      ) {
        if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
          const items = parsed.items.filter(
            (item) =>
              typeof item?.date === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
              typeof item?.name === "string"
          );
          if (!hasOnlyGenericHolidayNames(items)) {
            const set = new Set(items.map((item) => item.date));
            holidayCache.set(year, set);
            holidayItemCache.set(year, items);
            return set;
          }
        }

        if (Array.isArray(parsed?.dates)) {
          // Legacy cache format had dates only and no holiday names.
          // Ignore it so we can refresh from network and keep named holidays.
        }
      }
    }
  } catch {
    // Ignore cache read errors and continue with network fetch.
  }

  const endpoints = [
    `https://www.feriados.cl/feriados_en_chile_${year}.json`,
    `https://www.feriados.cl/feriados_en_chile.json`,
    `https://api.boostr.cl/holidays.json`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const body = await res.json();
      const items = extractHolidayItems(body).filter((item) => item.date.startsWith(`${year}-`));
      if (items.length > 0) {
        const set = new Set(items.map((item) => item.date));
        holidayCache.set(year, set);
        holidayItemCache.set(year, items);
        try {
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({ fetchedAt: Date.now(), items })
          );
        } catch {
          // Ignore cache write errors.
        }
        return set;
      }
    } catch {
      // Ignore endpoint errors and try next source.
    }
  }

  const empty = new Set<string>();
  holidayCache.set(year, empty);
  holidayItemCache.set(year, []);
  return empty;
}

export async function getChileHolidays(year: number): Promise<ChileHoliday[]> {
  if (holidayItemCache.has(year)) return holidayItemCache.get(year)!;
  await fetchChileHolidays(year);
  return holidayItemCache.get(year) ?? [];
}

export async function getChileHolidayDates(year: number): Promise<string[]> {
  const holidays = await getChileHolidays(year);
  return holidays.map((item) => item.date);
}

function isPresentEntry(entry: Entry): boolean {
  const values = entry.values ?? {};
  const raw = values.estado_asistencia ?? values.Asistencia ?? values.asistencia;
  if (typeof raw !== "string") return false;
  const value = raw.trim().toLowerCase();
  return value === "presente" || value === "asistio" || value === "asistió";
}

function isAttendanceEntry(entry: Entry): boolean {
  if (entry.type?.toLowerCase?.() === "asistencia") return true;
  const values = entry.values ?? {};
  return (
    Object.prototype.hasOwnProperty.call(values, "estado_asistencia") ||
    Object.prototype.hasOwnProperty.call(values, "Asistencia") ||
    Object.prototype.hasOwnProperty.call(values, "asistencia")
  );
}

function buildSummaryFromEntries(entries: Entry[], now: Date, holidays: Set<string>): AttendanceSummary {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const holidayMonthDates = listBusinessHolidayDates(monthStart, now, holidays);
  const holidayYearDates = listBusinessHolidayDates(yearStart, now, holidays);

  const byDay = new Map<string, boolean>();
  for (const entry of entries) {
    if (!isAttendanceEntry(entry)) continue;
    const createdAt = entry.createdAt?.toDate ? entry.createdAt.toDate() : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;
    const iso = toISODateLocal(createdAt);
    const hasPresent = isPresentEntry(entry);
    byDay.set(iso, (byDay.get(iso) ?? false) || hasPresent);
  }

  let presentMonth = 0;
  let presentYear = 0;
  for (const [iso, hasPresent] of byDay.entries()) {
    if (!hasPresent) continue;
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (!isWeekday(date) || holidays.has(iso) || date > now) continue;
    if (date >= monthStart) presentMonth += 1;
    if (date >= yearStart) presentYear += 1;
  }

  const expectedMonth = countBusinessDays(monthStart, now, holidays);
  const expectedYear = countBusinessDays(yearStart, now, holidays);

  const monthPercent = expectedMonth > 0 ? Math.round((presentMonth / expectedMonth) * 100) : 0;
  const yearPercent = expectedYear > 0 ? Math.round((presentYear / expectedYear) * 100) : 0;

  return {
    monthPercent,
    yearPercent,
    presentMonth,
    presentYear,
    expectedMonth,
    expectedYear,
    holidayMonthCount: holidayMonthDates.length,
    holidayYearCount: holidayYearDates.length,
    holidayMonthDates,
    holidayYearDates,
  };
}

export async function getAttendanceSummaries(
  organizationId: string,
  participantIds: string[],
  now: Date = new Date()
): Promise<Record<string, AttendanceSummary>> {
  if (participantIds.length === 0) return {};

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const holidays = await fetchChileHolidays(now.getFullYear());

  const summaries = await Promise.all(
    participantIds.map(async (participantId) => {
      const q = query(
        collection(db, "organizations", organizationId, "people", participantId, "entries"),
        where("createdAt", ">=", Timestamp.fromDate(yearStart)),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Entry));
      return [participantId, buildSummaryFromEntries(entries, now, holidays)] as const;
    })
  );

  return Object.fromEntries(summaries);
}
