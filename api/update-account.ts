import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function ensureAdminApp() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Faltan credenciales de servicio (FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY).");
  }
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

// Updates email/password for a Firebase Auth account other than the caller's own.
// Requires Admin SDK privileges, so this must run server-side (Vercel function),
// never in the client bundle.
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

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) {
    res.status(401).json({ error: "Falta el token de autenticación." });
    return;
  }

  const { organizationId, targetUid, email, password } = req.body || {};
  if (!organizationId || !targetUid) {
    res.status(400).json({ error: "Faltan organizationId o targetUid." });
    return;
  }
  if (!email && !password) {
    res.status(400).json({ error: "Debes indicar un nuevo correo y/o contraseña." });
    return;
  }
  if (password && String(password).length < 6) {
    res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    return;
  }

  const auth = getAuth();
  const db = getFirestore();

  let callerUid: string;
  try {
    callerUid = (await auth.verifyIdToken(idToken)).uid;
  } catch {
    res.status(401).json({ error: "Token inválido o expirado." });
    return;
  }

  const callerMemberSnap = await db.doc(`organizations/${organizationId}/members/${callerUid}`).get();
  if (!callerMemberSnap.exists || callerMemberSnap.data()?.role !== "admin") {
    res.status(403).json({ error: "Solo un administrador de la organización puede editar accesos." });
    return;
  }

  const targetMemberSnap = await db.doc(`organizations/${organizationId}/members/${targetUid}`).get();
  if (!targetMemberSnap.exists) {
    res.status(404).json({ error: "La cuenta indicada no pertenece a esta organización." });
    return;
  }

  try {
    const update: { email?: string; password?: string } = {};
    if (email) update.email = String(email).trim();
    if (password) update.password = String(password);
    await auth.updateUser(targetUid, update);
    res.status(200).json({ ok: true });
  } catch (e: any) {
    const message =
      e?.code === "auth/email-already-exists"
        ? "Ese correo ya está en uso por otra cuenta."
        : e?.code === "auth/invalid-email"
        ? "El correo no es válido."
        : "No se pudo actualizar la cuenta.";
    res.status(400).json({ error: message });
  }
}
