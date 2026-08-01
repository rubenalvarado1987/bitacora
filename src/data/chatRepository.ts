import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
  const q = query(
    collection(db, "organizations", organizationId, "chatThreads"),
    orderBy("title")
  );
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread));
    // Admins see all threads; others only see threads where they're listed as members
    const visible = role === "admin" ? all : all.filter((t) => t.memberIds.includes(uid));
    onChange(visible);
  });
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
