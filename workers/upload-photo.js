// Cloudflare Worker: recibe un POST multipart con la foto y la guarda en R2.
// Variables de entorno requeridas (Worker Settings → Variables & Secrets):
//   UPLOAD_SECRET  — cadena secreta que debe coincidir con EXPO_PUBLIC_WORKER_SECRET
//   PUBLIC_BASE_URL — URL pública del bucket (ej: https://pub-xxxx.r2.dev)
// Binding R2 requerido (Worker Settings → Bindings → R2):
//   R2_BUCKET → tu bucket de R2

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return json({ error: "Método no permitido." }, 405);
    }

    // Autenticación con el secreto compartido
    const auth = request.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
      return json({ error: "No autorizado." }, 401);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: "El cuerpo debe ser multipart/form-data." }, 400);
    }

    const file = formData.get("file");
    const participantId = formData.get("participantId");
    const profileId = formData.get("profileId");

    if (!file || (!participantId && !profileId)) {
      return json({ error: "Faltan los campos file y/o participantId/profileId." }, 400);
    }

    const key = participantId
      ? `participants/${participantId}/${Date.now()}.jpg`
      : `profiles/${profileId}/${Date.now()}.jpg`;

    // R2.put acepta Blob/File directamente; evita .stream() que no está en todos los runtimes.
    await env.R2_BUCKET.put(key, file, {
      httpMetadata: { contentType: "image/jpeg" },
    });

    const publicBase = (env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
    if (!publicBase) {
      return json({ error: "PUBLIC_BASE_URL no está configurado en el Worker." }, 500);
    }
    return json({ publicUrl: `${publicBase}/${key}` });
  },
};
