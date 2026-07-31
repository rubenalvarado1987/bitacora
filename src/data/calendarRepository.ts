import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CalendarEvent } from "../types";

export interface CalendarEventDraft {
  title: string;
  recurrence: "single" | "range" | "daily";
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  salonId?: string;
  scope: "global" | "salon";
}

export function listenCalendarEvents(
  organizationId: string,
  onChange: (items: CalendarEvent[]) => void
) {
  const q = query(collection(db, "organizations", organizationId, "calendar"), orderBy("date"));
  return onSnapshot(q, (snap) =>
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent)))
  );
}

export async function saveCalendarEvent(
  organizationId: string,
  draft: CalendarEventDraft,
  createdBy: string,
  id?: string
) {
  const ref = id
    ? doc(db, "organizations", organizationId, "calendar", id)
    : doc(collection(db, "organizations", organizationId, "calendar"));
  await setDoc(ref, {
    organizationId,
    title: draft.title,
    recurrence: draft.recurrence,
    date: draft.date,
    endDate: draft.recurrence === "range" ? draft.endDate || draft.date : null,
    startTime: draft.startTime || null,
    endTime: draft.endTime || null,
    description: draft.description || null,
    scope: draft.scope,
    salonId: draft.scope === "salon" ? draft.salonId || null : null,
    createdBy,
  });
  return ref.id;
}

export async function removeCalendarEvent(organizationId: string, eventId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "calendar", eventId));
}

// Indica si un evento (puntual, en rango o diario) ocurre en una fecha ISO dada (aaaa-mm-dd).
export function eventOccursOnDate(event: CalendarEvent, iso: string) {
  if (event.recurrence === "daily") return true;
  if (event.recurrence === "range") return iso >= event.date && iso <= (event.endDate || event.date);
  return iso === event.date;
}
