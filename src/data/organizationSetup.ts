import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { BusinessCategoryId, Organization } from "../types";
import { buildStarterTemplate, getBusinessCategory } from "./businessCatalog";

export async function createOrganizationFromWizard(params: {
  organizationName: string;
  categoryId: BusinessCategoryId;
  uid: string;
  displayName?: string | null;
  email?: string | null;
}) {
  const organizationRef = doc(collection(db, "organizations"));
  const templateId = `${organizationRef.id}-template`;
  const template = buildStarterTemplate(params.categoryId);
  const category = getBusinessCategory(params.categoryId);

  await setDoc(doc(db, "templates", templateId), {
    ...template,
    id: templateId,
    name: `${category.label} · ${template.name}`,
  });

  await setDoc(organizationRef, {
    name: params.organizationName.trim(),
    rubro: params.categoryId,
    businessCategoryId: params.categoryId,
    templateId,
    createdBy: params.uid,
    setupCompleted: true,
    modules: category.modules,
  });

  await setDoc(doc(db, "organizations", organizationRef.id, "members", params.uid), {
    uid: params.uid,
    organizationId: organizationRef.id,
    role: "admin",
    name: params.displayName?.trim() || params.email?.trim() || "Admin",
  });

  // Mapa uid -> organizationId para ubicar la membresía sin collectionGroup en próximos logins.
  await setDoc(doc(db, "users", params.uid), {
    organizationId: organizationRef.id,
  });

  return {
    organizationId: organizationRef.id,
    templateId,
  };
}

export function listenOrganization(organizationId: string, onChange: (org: Organization | null) => void) {
  return onSnapshot(doc(db, "organizations", organizationId), (snap) => {
    onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null);
  });
}

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const snap = await getDoc(doc(db, "organizations", organizationId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null;
}

export async function updateOrganizationBranding(
  organizationId: string,
  data: { name?: string; logoUrl?: string }
) {
  await updateDoc(doc(db, "organizations", organizationId), {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl || null } : {}),
  });
}