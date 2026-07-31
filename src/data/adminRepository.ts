import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { EconomicPlan, Person, ProfileRecord, Salon } from "../types";

export interface ProfileDraft {
  displayName: string;
  username: string;
  role: "admin" | "editor" | "lector";
  active: boolean;
  linkedUid?: string | null;
  notes?: string;
}

export interface PlanDraft {
  name: string;
  cost: number;
  period: string;
  validUntil?: string;
  active: boolean;
}

export interface ParticipantDraft {
  name: string;
  templateId: string;
  status: "activo" | "inactivo";
  baseData: Record<string, string | number | boolean>;
  planId?: string;
  salonIds?: string[];
  linkedUid?: string | null;
}

export interface SalonDraft {
  name: string;
  active: boolean;
  professionalIds: string[];
  participantIds: string[];
}

export function listenProfiles(organizationId: string, onChange: (items: ProfileRecord[]) => void) {
  const q = query(collection(db, "organizations", organizationId, "profiles"), orderBy("displayName"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as ProfileRecord)));
  });
}

export async function saveProfile(organizationId: string, draft: ProfileDraft, id?: string) {
  const ref = id
    ? doc(db, "organizations", organizationId, "profiles", id)
    : doc(collection(db, "organizations", organizationId, "profiles"));

  await setDoc(ref, {
    organizationId,
    ...draft,
  });

  return ref.id;
}

export async function removeProfile(organizationId: string, profileId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "profiles", profileId));
}

// Perfil propio de un editor/profesional (para saber qué salones tiene asignados). No requiere rol admin:
// las reglas permiten leer solo el/los doc(s) cuyo linkedUid coincide con el uid del solicitante.
export function listenMyProfile(
  organizationId: string,
  uid: string,
  onChange: (profile: ProfileRecord | null) => void
) {
  const q = query(collection(db, "organizations", organizationId, "profiles"), where("linkedUid", "==", uid));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ProfileRecord));
  });
}

export function listenPlans(organizationId: string, onChange: (items: EconomicPlan[]) => void) {
  const q = query(collection(db, "organizations", organizationId, "plans"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as EconomicPlan)));
  });
}

export async function savePlan(organizationId: string, draft: PlanDraft, id?: string) {
  const ref = id
    ? doc(db, "organizations", organizationId, "plans", id)
    : doc(collection(db, "organizations", organizationId, "plans"));

  await setDoc(ref, {
    organizationId,
    ...draft,
    validUntil: draft.validUntil || null,
  });

  return ref.id;
}

export async function removePlan(organizationId: string, planId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "plans", planId));
}

export function listenParticipants(organizationId: string, onChange: (items: Person[]) => void) {
  const q = query(collection(db, "organizations", organizationId, "people"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Person)));
  });
}

export async function saveParticipant(organizationId: string, draft: ParticipantDraft, id?: string) {
  const ref = id
    ? doc(db, "organizations", organizationId, "people", id)
    : doc(collection(db, "organizations", organizationId, "people"));

  await setDoc(ref, {
    organizationId,
    name: draft.name,
    displayName: draft.name,
    templateId: draft.templateId,
    status: draft.status,
    baseData: draft.baseData,
    planId: draft.planId || null,
    salonIds: draft.salonIds || [],
    linkedUid: draft.linkedUid || null,
  });

  return ref.id;
}

export async function removeParticipant(organizationId: string, participantId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "people", participantId));
}

export function listenSalons(organizationId: string, onChange: (items: Salon[]) => void) {
  const q = query(collection(db, "organizations", organizationId, "salons"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Salon)));
  });
}

export async function saveSalon(organizationId: string, draft: SalonDraft, id?: string) {
  const ref = id
    ? doc(db, "organizations", organizationId, "salons", id)
    : doc(collection(db, "organizations", organizationId, "salons"));

  await setDoc(ref, {
    organizationId,
    ...draft,
  });

  return ref.id;
}

export async function removeSalon(organizationId: string, salonId: string) {
  await deleteDoc(doc(db, "organizations", organizationId, "salons", salonId));
}