import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Entry } from "../types";

export interface EntryDraft {
  type: string;
  values: Record<string, string | number | boolean>;
}

export function listenEntries(
  organizationId: string,
  personId: string,
  onChange: (items: Entry[]) => void
) {
  const q = query(
    collection(db, "organizations", organizationId, "people", personId, "entries"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) =>
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Entry)))
  );
}

export async function createEntry(
  organizationId: string,
  personId: string,
  draft: EntryDraft,
  authorUid: string,
  authorName: string
) {
  await addDoc(
    collection(db, "organizations", organizationId, "people", personId, "entries"),
    {
      personId,
      authorUid,
      authorName,
      type: draft.type,
      values: draft.values,
      createdAt: serverTimestamp(),
    }
  );
}

// HU-18: same entry applied independently to multiple participants
export async function createEntryBulk(
  organizationId: string,
  personIds: string[],
  draft: EntryDraft,
  authorUid: string,
  authorName: string
) {
  await Promise.all(
    personIds.map((pid) => createEntry(organizationId, pid, draft, authorUid, authorName))
  );
}
