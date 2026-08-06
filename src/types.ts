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
  accountEmail?: string;
  photoUrl?: string | null;
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

export type EmergencyContactRelationship = "Padre" | "Madre" | "Padrastro" | "Madrastra" | "Tutor/a legal" | "Apoderado/a (sin parentesco biológico)" | "Pareja" | "Cónyuge" | "Abuela" | "Abuelo";

export interface ProfileRecord {
  id: string;
  organizationId: string;
  displayName: string;
  username: string;
  role: "admin" | "editor" | "lector";
  active: boolean;
  photoUrl?: string | null;
  linkedUid?: string | null;
  accountEmail?: string;
  nationality?: string;
  birthDate?: string;
  idNumber?: string;
  addressStreet?: string;
  comuna?: string;
  phone?: string;
  personalEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: EmergencyContactRelationship;
  salonIds?: string[];
  position?: string;
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
  logoUrl?: string;
  addressStreet?: string;
  comuna?: string;
  region?: string;
  phone?: string;
  email?: string;
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

export interface SalonScheduleEntry {
  type: "mañana" | "tarde" | "extendida";
  startTime: string;
  endTime: string;
}

export type SalonSchedule = SalonScheduleEntry[];

export type SalonEducationalLevel =
  | "sala_cuna_menor"
  | "sala_cuna_mayor"
  | "medio_menor"
  | "medio_mayor"
  | "prekinder"
  | "kinder";

export interface Salon {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  professionalIds: string[];
  participantIds: string[];
  schedule?: SalonSchedule;
  maxCapacity?: number;
  educationalLevel?: SalonEducationalLevel;
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
  readBy?: Record<string, any>;
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
  // "single": un día puntual (usa `date`). "range": desde `date` hasta `endDate`. "daily": se repite todos los días.
  recurrence: "single" | "range" | "daily";
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  description?: string;
  salonId?: string;
  scope: "global" | "salon";
  createdBy: string;
}
