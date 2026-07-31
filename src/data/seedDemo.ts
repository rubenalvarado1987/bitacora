import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { seedTemplates } from "./seedTemplates";

/**
 * Crea, dentro de una organización existente, la plantilla del rubro elegido
 * y un par de personas de ejemplo con su ficha base. Pensada para probar
 * rápido la app en un proyecto Firebase nuevo, no para producción.
 *
 * Requisitos previos (hacerlo una vez desde la consola de Firebase o con
 * un script de administración):
 *  1. Crear el documento organizations/{organizationId} con { name, rubro }.
 *  2. Crear organizations/{organizationId}/members/{tuUid} con { uid, role: "admin" }.
 */
export async function seedDemoData(organizationId: string, rubro: keyof typeof seedTemplates) {
  const template = seedTemplates[rubro];
  if (!template) throw new Error(`No existe plantilla de ejemplo para el rubro "${rubro}"`);

  await setDoc(doc(db, "templates", template.id), template);
  await setDoc(
    doc(db, "organizations", organizationId),
    { name: organizationId, rubro, templateId: template.id },
    { merge: true }
  );

  const ejemplos = demoPeopleByRubro[rubro] ?? [];
  for (const persona of ejemplos) {
    await setDoc(doc(db, "organizations", organizationId, "people", persona.id), {
      ...persona,
      organizationId,
      templateId: template.id,
      status: "activo",
    });
  }
}

export async function bootstrapDemoOrganization(params: {
  organizationId: string;
  uid: string;
  rubro: keyof typeof seedTemplates;
  name?: string;
  email?: string | null;
}) {
  const { organizationId, uid, rubro, name, email } = params;

  await setDoc(doc(db, "organizations", organizationId), {
    name: name || `Organizacion ${rubro}`,
    rubro,
    createdBy: uid,
  });

  await setDoc(doc(db, "organizations", organizationId, "members", uid), {
    uid,
    role: "admin",
    name: name || email || "Administrador",
  });

  await seedDemoData(organizationId, rubro);
}

const demoPeopleByRubro: Record<string, { id: string; name: string; baseData: Record<string, string> }[]> = {
  colegio: [
    { id: "p1", name: "Martina Rojas", baseData: { apoderado: "C. Rojas", curso: "4to Básico B", necesidad_especial: "Ninguna" } },
  ],
  hogar: [
    { id: "p1", name: "Hernán Soto", baseData: { alergias: "Penicilina", dependencia: "Moderada", contacto_emergencia: "Familia Soto" } },
  ],
  gimnasio: [
    { id: "p1", name: "Ignacio Vidal", baseData: { meta: "Fuerza tren inferior", lesion_previa: "Rodilla derecha" } },
  ],
  psicologia: [
    { id: "p1", name: "Paciente P-014", baseData: { motivo: "Ansiedad", consentimiento: "Firmado" } },
  ],
};
