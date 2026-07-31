import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { BusinessCategoryId } from "../types";
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