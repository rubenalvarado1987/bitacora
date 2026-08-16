#!/usr/bin/env node

/**
 * Migra salones antiguos para completar jornadaId/jornadaName según schedule.
 *
 * Uso:
 *   node scripts/migrate-salon-jornadas.cjs --org=<ORG_ID>
 *   node scripts/migrate-salon-jornadas.cjs --org=<ORG_ID> --create-missing
 *   node scripts/migrate-salon-jornadas.cjs --org=<ORG_ID> --apply
 *   node scripts/migrate-salon-jornadas.cjs --org=<ORG_ID> --create-missing --apply
 *
 * Variables de entorno requeridas:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 */

const admin = require("firebase-admin");

function parseArgs(argv) {
  const out = {
    orgId: "",
    apply: false,
    createMissing: false,
  };

  for (const arg of argv) {
    if (arg === "--apply") out.apply = true;
    if (arg === "--create-missing") out.createMissing = true;
    if (arg.startsWith("--org=")) out.orgId = arg.slice("--org=".length).trim();
  }

  return out;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno: ${name}`);
  }
  return value;
}

function normalizeSchedule(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      type: typeof item.type === "string" ? item.type.trim() : "",
      startTime: typeof item.startTime === "string" ? item.startTime.trim() : "",
      endTime: typeof item.endTime === "string" ? item.endTime.trim() : "",
    }))
    .filter((item) => item.type && item.startTime && item.endTime)
    .sort((a, b) => a.type.localeCompare(b.type));
}

function scheduleSignature(schedule) {
  const normalized = normalizeSchedule(schedule);
  if (normalized.length === 0) return "";
  return normalized.map((item) => `${item.type}|${item.startTime}|${item.endTime}`).join(";");
}

function buildGeneratedJornadaName(index) {
  return `Jornada migrada ${String(index).padStart(2, "0")}`;
}

async function run() {
  const { orgId, apply, createMissing } = parseArgs(process.argv.slice(2));

  if (!orgId) {
    throw new Error("Debes indicar --org=<ORG_ID>");
  }

  const projectId = requiredEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = requiredEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = requiredEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  const db = admin.firestore();
  const orgRef = db.collection("organizations").doc(orgId);
  const jornadasRef = orgRef.collection("jornadas");
  const salonsRef = orgRef.collection("salons");

  const [jornadasSnap, salonsSnap] = await Promise.all([jornadasRef.get(), salonsRef.get()]);

  const bySignature = new Map();
  const jornadasById = new Map();

  jornadasSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    jornadasById.set(docSnap.id, { id: docSnap.id, ...data });
    const signature = scheduleSignature(data.schedule);
    if (signature && !bySignature.has(signature)) {
      bySignature.set(signature, {
        id: docSnap.id,
        name: typeof data.name === "string" ? data.name : "Jornada",
      });
    }
  });

  let generatedCount = 0;
  const updates = [];

  for (const salonDoc of salonsSnap.docs) {
    const salon = salonDoc.data() || {};
    const alreadyLinked = typeof salon.jornadaId === "string" && salon.jornadaId.trim() && typeof salon.jornadaName === "string" && salon.jornadaName.trim();
    if (alreadyLinked) continue;

    const signature = scheduleSignature(salon.schedule);
    if (!signature) continue;

    let match = bySignature.get(signature);

    if (!match && createMissing) {
      generatedCount += 1;
      const jornadaPayload = {
        organizationId: orgId,
        name: buildGeneratedJornadaName(generatedCount),
        active: false,
        schedule: normalizeSchedule(salon.schedule),
      };

      if (apply) {
        const created = await jornadasRef.add(jornadaPayload);
        match = { id: created.id, name: jornadaPayload.name };
      } else {
        match = { id: `DRY_RUN_GENERATED_${generatedCount}`, name: jornadaPayload.name };
      }

      bySignature.set(signature, match);
    }

    if (!match) continue;

    updates.push({
      salonId: salonDoc.id,
      salonName: typeof salon.name === "string" ? salon.name : salonDoc.id,
      jornadaId: match.id,
      jornadaName: match.name,
    });
  }

  console.log("--- Migracion salones -> jornadas ---");
  console.log(`Organizacion: ${orgId}`);
  console.log(`Modo: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Crear jornadas faltantes: ${createMissing ? "SI" : "NO"}`);
  console.log(`Salones candidatos a actualizar: ${updates.length}`);

  updates.forEach((item) => {
    console.log(`- ${item.salonName} (${item.salonId}) => ${item.jornadaName} [${item.jornadaId}]`);
  });

  if (!apply) {
    console.log("\nNo se aplicaron cambios. Ejecuta con --apply para persistir.");
    return;
  }

  const batchSize = 400;
  for (let i = 0; i < updates.length; i += batchSize) {
    const chunk = updates.slice(i, i + batchSize);
    const batch = db.batch();
    for (const item of chunk) {
      const salonRef = salonsRef.doc(item.salonId);
      batch.update(salonRef, {
        jornadaId: item.jornadaId,
        jornadaName: item.jornadaName,
      });
    }
    await batch.commit();
  }

  console.log(`\nActualizacion finalizada. Salones actualizados: ${updates.length}`);
}

run().catch((error) => {
  console.error("Error en migracion:", error.message);
  process.exit(1);
});
