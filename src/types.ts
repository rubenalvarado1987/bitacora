export type FieldType =
  | "text"
  | "number"
  | "date"
  | "time"
  | "select"
  | "scale"
  | "checklist"
  | "photo"
  | "signature";

export type BusinessCategoryId =
  | "jardin-infantil"
  | "casa-de-reposo"
  | "hotel-de-mascotas"
  | "gym"
  | "profesional-a-domicilio";

export interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}

export interface Template {
  id: string;
  rubro: "colegio" | "hogar" | "gimnasio" | "psicologia" | string;
  name: string;
  // Secciones que describen a la persona (se llenan una vez, se editan poco).
  baseSections: TemplateSection[];
  // Secciones que se repiten en cada registro de la bitácora (se llenan seguido).
  entrySections: TemplateSection[];
  version: number;
}

export interface Person {
  id: string;
  organizationId: string;
  templateId: string;
  name: string;
  displayName?: string;
  status: "activo" | "inactivo";
  baseData: Record<string, string | number | boolean>;
  planId?: string;
  salonIds?: string[];
  linkedUid?: string | null;
}

export interface Entry {
  id: string;
  personId: string;
  authorUid: string;
  authorName?: string;
  type: string;
  values: Record<string, string | number | boolean>;
  createdAt: any; // Firestore Timestamp
}

export interface Membership {
  uid: string;
  organizationId: string;
  role: "admin" | "editor" | "lector" | "profesional" | "lectura";
  name?: string;
}

export interface ProfileRecord {
  id: string;
  organizationId: string;
  displayName: string;
  username: string;
  role: "admin" | "editor" | "lector";
  active: boolean;
  linkedUid?: string | null;
  notes?: string;
}

export interface Organization {
  id: string;
  name: string;
  rubro: string;
  templateId: string;
  businessCategoryId?: BusinessCategoryId;
  createdBy?: string;
  setupCompleted?: boolean;
  modules?: string[];
}

export interface EconomicPlan {
  id: string;
  organizationId: string;
  name: string;
  cost: number;
  period: string;
  validUntil?: string | null;
  active: boolean;
}

export interface Salon {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  professionalIds: string[];
  participantIds: string[];
}

export interface ParticipantProfile {
  id: string;
  organizationId: string;
  displayName: string;
  status: "activo" | "inactivo";
  planId?: string;
  salonIds?: string[];
  technicalSheet: Record<string, string | number | boolean>;
}

export interface ChatThread {
  id: string;
  organizationId: string;
  title: string;
  scope: "global" | "salon" | "participant";
  salonId?: string;
  salonName?: string;
  participantId?: string;
  memberIds: string[];
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorUid: string;
  authorName: string;
  authorRole: "admin" | "editor" | "lector" | "profesional" | "lectura";
  text: string;
  createdAt: any;
  attachments?: string[];
}

export interface CalendarEvent {
  id: string;
  organizationId: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  salonId?: string;
  scope: "global" | "salon";
  createdBy: string;
}
