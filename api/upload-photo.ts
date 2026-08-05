import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function ensureAdminApp() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey)
    throw new Error("Faltan credenciales de Firebase Admin.");
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

function buildR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey)
    throw new Error("Faltan R2_ACCOUNT_ID, R2_ACCESS_KEY_ID o R2_SECRET_ACCESS_KEY.");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

// Genera una URL prefirmada (PUT) para que el cliente suba la foto directamente a R2.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido." });
    return;
  }

  try {
    ensureAdminApp();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
    return;
  }

  const idToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/, "");
  if (!idToken) {
    res.status(401).json({ error: "Falta token de autenticación." });
    return;
  }
  try {
    await getAuth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: "Token inválido o expirado." });
    return;
  }

  const { participantId, profileId } = req.body ?? {};
  if (!participantId && !profileId) {
    res.status(400).json({ error: "Falta participantId o profileId." });
    return;
  }

  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!bucket || !publicBase) {
    res.status(500).json({ error: "Faltan R2_BUCKET o R2_PUBLIC_URL en el servidor." });
    return;
  }

  const key = participantId
    ? `participants/${participantId}/${Date.now()}.jpg`
    : `profiles/${profileId}/${Date.now()}.jpg`;

  try {
    const r2 = buildR2Client();
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "image/jpeg" });
    const uploadUrl = await getSignedUrl(r2, cmd, { expiresIn: 300 });
    res.status(200).json({ uploadUrl, publicUrl: `${publicBase}/${key}` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
