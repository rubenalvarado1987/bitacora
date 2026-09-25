import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { ChatMessage, ChatThread } from "../types";

export interface ThreadDraft {
  title: string;
  scope: "global" | "salon" | "participant";
  salonId?: string;
  salonName?: string;
  participantId?: string;
  memberIds: string[];
}

export function listenThreads(
  organizationId: string,
  uid: string,
  role: string,
  onChange: (items: ChatThread[]) => void
) {
  const col = collection(db, "organizations", organizationId, "chatThreads");

  if (role === "admin") {
    const q = query(col, orderBy("title"));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as ChatThread))
          .filter((t) => t.status !== "closed");
        items.sort((a, b) => a.title.localeCompare(b.title));
        onChange(items);
      },
      (error) => {
        console.error("listenThreads error:", error.code, error.message);
        onChange([]);
      }
    );
  }

  // No-admin: dos queries en paralelo — hilos donde el usuario es miembro
  // Y todos los hilos de scope global (que deben llegar a toda la comunidad).
  const memberMap = new Map<string, ChatThread>();
  const globalMap = new Map<string, ChatThread>();

  const emit = () => {
    const merged = new Map([...memberMap, ...globalMap]);
    const items = Array.from(merged.values()).filter((t) => t.status !== "closed");
    items.sort((a, b) => a.title.localeCompare(b.title));
    onChange(items);
  };

  const qMember = query(col, where("memberIds", "array-contains", uid));
  const qGlobal = query(col, where("scope", "==", "global"));

  const unsubMember = onSnapshot(qMember, (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const id of memberMap.keys()) { if (!ids.has(id)) memberMap.delete(id); }
    snap.docs.forEach((d) => memberMap.set(d.id, { id: d.id, ...d.data() } as ChatThread));
    emit();
  }, (error) => { console.error("listenThreads (member):", error.code); emit(); });

  const unsubGlobal = onSnapshot(qGlobal, (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const id of globalMap.keys()) { if (!ids.has(id)) globalMap.delete(id); }
    snap.docs.forEach((d) => globalMap.set(d.id, { id: d.id, ...d.data() } as ChatThread));
    emit();
  }, (error) => { console.error("listenThreads (global):", error.code); emit(); });

  return () => { unsubMember(); unsubGlobal(); };
}

export async function createThread(organizationId: string, draft: ThreadDraft) {
  const ref = doc(collection(db, "organizations", organizationId, "chatThreads"));
  // Firestore rechaza campos con valor undefined — los eliminamos antes de guardar
  const raw = { organizationId, ...draft, status: "open", createdAt: serverTimestamp() };
  const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined));
  await setDoc(ref, data);
  return ref.id;
}

export async function closeThread(organizationId: string, threadId: string, closedByUid: string) {
  const ref = doc(db, "organizations", organizationId, "chatThreads", threadId);
  await updateDoc(ref, { status: "closed", closedAt: serverTimestamp(), closedBy: closedByUid });
}

export function listenClosedThreads(
  organizationId: string,
  uid: string,
  role: string,
  onChange: (items: ChatThread[]) => void
) {
  const col = collection(db, "organizations", organizationId, "chatThreads");

  if (role === "admin") {
    const q = query(col, where("status", "==", "closed"));
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread));
        items.sort((a, b) => a.title.localeCompare(b.title));
        onChange(items);
      },
      () => onChange([])
    );
  }

  // No-admin: hilos cerrados donde el usuario es miembro + hilos globales cerrados
  const memberMap = new Map<string, ChatThread>();
  const globalMap = new Map<string, ChatThread>();

  const emit = () => {
    const merged = new Map([...memberMap, ...globalMap]);
    const items = Array.from(merged.values());
    items.sort((a, b) => a.title.localeCompare(b.title));
    onChange(items);
  };

  const qMember = query(col, where("memberIds", "array-contains", uid), where("status", "==", "closed"));
  const qGlobal = query(col, where("scope", "==", "global"), where("status", "==", "closed"));

  const unsubMember = onSnapshot(qMember, (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const id of memberMap.keys()) { if (!ids.has(id)) memberMap.delete(id); }
    snap.docs.forEach((d) => memberMap.set(d.id, { id: d.id, ...d.data() } as ChatThread));
    emit();
  }, () => emit());

  const unsubGlobal = onSnapshot(qGlobal, (snap) => {
    const ids = new Set(snap.docs.map((d) => d.id));
    for (const id of globalMap.keys()) { if (!ids.has(id)) globalMap.delete(id); }
    snap.docs.forEach((d) => globalMap.set(d.id, { id: d.id, ...d.data() } as ChatThread));
    emit();
  }, () => emit());

  return () => { unsubMember(); unsubGlobal(); };
}

export function listenThread(
  organizationId: string,
  threadId: string,
  onChange: (thread: ChatThread | null) => void
) {
  const ref = doc(db, "organizations", organizationId, "chatThreads", threadId);
  return onSnapshot(ref, (snap) => {
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as ChatThread) : null);
  });
}

export async function markThreadRead(organizationId: string, threadId: string, uid: string) {
  const ref = doc(db, "organizations", organizationId, "chatThreads", threadId);
  await updateDoc(ref, { [`readBy.${uid}`]: serverTimestamp() });
}

export async function updateThreadMembers(organizationId: string, threadId: string, memberIds: string[]) {
  const ref = doc(db, "organizations", organizationId, "chatThreads", threadId);
  await updateDoc(ref, { memberIds });
}

export function listenMessages(
  organizationId: string,
  threadId: string,
  onChange: (items: ChatMessage[]) => void
) {
  const q = query(
    collection(db, "organizations", organizationId, "chatThreads", threadId, "messages"),
    orderBy("createdAt")
  );
  return onSnapshot(q, (snap) =>
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage)))
  );
}

export function listenUnreadThreadCount(
  organizationId: string,
  uid: string,
  role: string,
  onChange: (count: number) => void
) {
  const threadById = new Map<string, ChatThread>();
  const latestMessageMs = new Map<string, number | null>();
  const unsubByThreadId = new Map<string, () => void>();

  const getTimestampMs = (value: any): number | null => {
    if (!value) return null;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value instanceof Date) return value.getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  };

  const emitUnreadCount = () => {
    let count = 0;
    for (const [threadId, thread] of threadById.entries()) {
      const messageMs = latestMessageMs.get(threadId) ?? null;
      if (!messageMs) continue;
      const readMs = getTimestampMs(thread.readBy?.[uid]);
      if (!readMs || messageMs > readMs) {
        count += 1;
      }
    }
    onChange(count);
  };

  const unsubscribeThreads = listenThreads(organizationId, uid, role, (threads) => {
    const activeIds = new Set(threads.map((t) => t.id));

    for (const threadId of threadById.keys()) {
      if (!activeIds.has(threadId)) {
        threadById.delete(threadId);
        latestMessageMs.delete(threadId);
        const unsub = unsubByThreadId.get(threadId);
        if (unsub) unsub();
        unsubByThreadId.delete(threadId);
      }
    }

    for (const thread of threads) {
      threadById.set(thread.id, thread);
      if (unsubByThreadId.has(thread.id)) continue;

      const q = query(
        collection(db, "organizations", organizationId, "chatThreads", thread.id, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const unsub = onSnapshot(
        q,
        (snap) => {
          const latest = snap.docs[0]?.data();
          latestMessageMs.set(thread.id, getTimestampMs(latest?.createdAt));
          emitUnreadCount();
        },
        (error) => {
          console.error("listenUnreadThreadCount error:", error.code, error.message);
          latestMessageMs.set(thread.id, null);
          emitUnreadCount();
        }
      );

      unsubByThreadId.set(thread.id, unsub);
    }

    emitUnreadCount();
  });

  return () => {
    unsubscribeThreads();
    for (const unsub of unsubByThreadId.values()) {
      unsub();
    }
  };
}

export async function sendMessage(params: {
  organizationId: string;
  threadId: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorRole: ChatMessage["authorRole"];
  salonName?: string;
}) {
  // Privacy rule (HU-23): editors in salon-scoped threads show as the salon name
  const displayName =
    (params.authorRole === "editor" || params.authorRole === "profesional") && params.salonName
      ? params.salonName
      : params.authorName;

  await addDoc(
    collection(
      db,
      "organizations",
      params.organizationId,
      "chatThreads",
      params.threadId,
      "messages"
    ),
    {
      threadId: params.threadId,
      authorUid: params.authorUid,
      authorName: displayName,
      authorRole: params.authorRole,
      text: params.text.trim(),
      createdAt: serverTimestamp(),
    }
  );
}
