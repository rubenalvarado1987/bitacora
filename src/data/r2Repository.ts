import { auth } from "../firebase";

const WORKER_URL = (process.env.EXPO_PUBLIC_WORKER_URL ?? "").replace(/\/$/, "");
const WORKER_SECRET = process.env.EXPO_PUBLIC_WORKER_SECRET ?? "";

export function isR2Configured(): boolean {
  return Boolean(WORKER_URL && WORKER_SECRET);
}

/**
 * Sube una foto de participante al Worker de Cloudflare y devuelve la URL pública.
 *
 * Flujo: POST multipart → Worker → R2 binding → { publicUrl }
 */
export async function uploadParticipantPhoto(
  imageUri: string,
  participantId: string
): Promise<string> {
  if (!auth.currentUser) throw new Error("Usuario no autenticado.");

  // fetch(imageUri) funciona tanto con blob: (web) como con file:// (native).
  const fileRes = await fetch(imageUri);
  const blob = await fileRes.blob();

  const form = new FormData();
  form.append("file", blob, `participant_${participantId}_${Date.now()}.jpg`);
  form.append("participantId", participantId);

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${WORKER_SECRET}` },
    body: form,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Worker: ${data.error ?? res.statusText}`);

  return data.publicUrl as string;
}
