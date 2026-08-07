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
  // Los no admin deben filtrar con un where("memberIds", "array-contains", uid): la regla de
  // Firestore valida la membresía por documento y rechaza el listado completo si la consulta
  // no trae ese filtro (no puede probar que todos los resultados cumplirán la regla).
  const q =
    role === "admin"
      ? query(collection(db, "organizations", organizationId, "chatThreads"), orderBy("title"))
      : query(
          collection(db, "organizations", organizationId, "chatThreads"),
          where("memberIds", "array-contains", uid)
        );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread));
      items.sort((a, b) => a.title.localeCompare(b.title));
      onChange(items);
    },
    (error) => {
      console.error("listenThreads error:", error.code, error.message);
      onChange([]);
    }
  );
}

export async function createThread(organizationId: string, draft: ThreadDraft) {
  const ref = doc(collection(db, "organizations", organizationId, "chatThreads"));
  await setDoc(ref, { organizationId, ...draft });
  return ref.id;
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
