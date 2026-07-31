import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { CalendarEvent } from "../types";

export interface CalendarEventDraft {
  title: string;
  date: string;
  time?: string;
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
  await setDoc(ref, { organizationId, ...draft, createdBy });
  return ref.id;
}

export async function removeCalendarEvent(organizationId: string, eventId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "calendar", eventId));
}
