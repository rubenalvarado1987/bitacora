import { auth } from "../firebase";

export interface UpdateLinkedAccountParams {
  organizationId: string;
  targetUid: string;
  email?: string;
  password?: string;
}

// Calls the server-side /api/update-account endpoint (Admin SDK) because the
// client SDK cannot change another user's email/password without their current one.
// Only works where the Vercel serverless function is actually running (deployed
// preview/production, or `vercel dev`) — a plain `expo start --web` dev server has no /api routes.
export async function updateLinkedAccountCredentials(params: UpdateLinkedAccountParams): Promise<void> {
  const current = auth.currentUser;
  if (!current) {
    throw new Error("Debes iniciar sesión.");
  }
  const idToken = await current.getIdToken();

  let res: Response;
  try {
    res = await fetch("/api/update-account", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(params),
    });
  } catch {
    throw new Error("No se pudo contactar el servidor. Verifica tu conexión.");
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (!isJson) {
    throw new Error(
      "El servicio para actualizar accesos no está disponible en este entorno (solo funciona en la app publicada en Vercel)."
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "No se pudo actualizar el acceso.");
  }
}
