import { Entry } from "../types";

export interface EntryDayGroup {
  dateKey: string;
  label: string;
  items: Entry[];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLabel(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function groupEntriesByDay(entries: Entry[]): EntryDayGroup[] {
  const groups = new Map<string, EntryDayGroup>();

  for (const entry of entries) {
    const date = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date();
    const dateKey = toDateKey(date);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.items.push(entry);
      continue;
    }
    groups.set(dateKey, {
      dateKey,
      label: toLabel(date),
      items: [entry],
    });
  }

  return [...groups.values()];
}
