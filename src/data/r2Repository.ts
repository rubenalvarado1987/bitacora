import { getIdToken } from "firebase/auth";
import { auth } from "../firebase";

const WORKER_URL = (process.env.EXPO_PUBLIC_WORKER_URL ?? "").replace(/\/$/, "");
const WORKER_SECRET = process.env.EXPO_PUBLIC_WORKER_SECRET ?? "";
// En producción Vercel, R2_ENABLED=true activa el picker y usa /api/upload-photo.
const R2_ENABLED = process.env.EXPO_PUBLIC_R2_ENABLED === "true";

export function isR2Configured(): boolean {
  return R2_ENABLED || Boolean(WORKER_URL && WORKER_SECRET);
}

/**
 * Sube una foto de participante a R2 y devuelve la URL pública.
 *
 * Rutas (en orden de preferencia):
 *   1. Worker de Cloudflare (EXPO_PUBLIC_WORKER_URL) — dev local o despliegue propio
 *   2. Función Vercel /api/upload-photo         — producción Vercel (EXPO_PUBLIC_R2_ENABLED=true)
 */
export async function uploadParticipantPhoto(
  imageUri: string,
  participantId: string
): Promise<string> {
  if (!auth.currentUser) throw new Error("Usuario no autenticado.");

  // fetch(imageUri) funciona tanto con blob: (web) como con file:// (native).
  const fileRes = await fetch(imageUri);
  const blob = await fileRes.blob();

  if (WORKER_URL && WORKER_SECRET) {
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

  // Ruta Vercel: presigned PUT generado server-side con las credenciales R2.
  const idToken = await getIdToken(auth.currentUser);
  const metaRes = await fetch("/api/upload-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ participantId }),
  });
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({}));
    throw new Error(`upload-photo: ${body.error ?? metaRes.statusText}`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`R2 PUT: ${putRes.status} ${putRes.statusText}`);
  return publicUrl as string;
}

export async function uploadProfilePhoto(
  imageUri: string,
  profileId: string
): Promise<string> {
  if (!auth.currentUser) throw new Error("Usuario no autenticado.");

  // fetch(imageUri) funciona tanto con blob: (web) como con file:// (native).
  const fileRes = await fetch(imageUri);
  const blob = await fileRes.blob();

  if (WORKER_URL && WORKER_SECRET) {
    const form = new FormData();
    form.append("file", blob, `profile_${profileId}_${Date.now()}.jpg`);
    form.append("profileId", profileId);

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${WORKER_SECRET}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Worker: ${data.error ?? res.statusText}`);
    return data.publicUrl as string;
  }

  // Ruta Vercel: presigned PUT generado server-side con las credenciales R2.
  const idToken = await getIdToken(auth.currentUser);
  const metaRes = await fetch("/api/upload-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ profileId }),
  });
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({}));
    throw new Error(`upload-photo: ${body.error ?? metaRes.statusText}`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`R2 PUT: ${putRes.status} ${putRes.statusText}`);
  return publicUrl as string;
}

export async function uploadOrganizationPhoto(
  imageUri: string,
  organizationId: string
): Promise<string> {
  if (!auth.currentUser) throw new Error("Usuario no autenticado.");

  // fetch(imageUri) funciona tanto con blob: (web) como con file:// (native).
  const fileRes = await fetch(imageUri);
  const blob = await fileRes.blob();

  if (WORKER_URL && WORKER_SECRET) {
    const form = new FormData();
    form.append("file", blob, `organization_${organizationId}_${Date.now()}.jpg`);
    form.append("organizationId", organizationId);

    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${WORKER_SECRET}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Worker: ${data.error ?? res.statusText}`);
    return data.publicUrl as string;
  }

  // Ruta Vercel: presigned PUT generado server-side con las credenciales R2.
  const idToken = await getIdToken(auth.currentUser);
  const metaRes = await fetch("/api/upload-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ organizationId }),
  });
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({}));
    throw new Error(`upload-photo: ${body.error ?? metaRes.statusText}`);
  }
  const { uploadUrl, publicUrl } = await metaRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`R2 PUT: ${putRes.status} ${putRes.statusText}`);
  return publicUrl as string;
}
