export type RoadmapStatus = "Base creada" | "En construcción" | "Pendiente";

export interface RoadmapEpic {
  id: string;
  title: string;
  status: RoadmapStatus;
  summary: string;
}

export const roadmapEpics: RoadmapEpic[] = [
  {
    id: "hu-01",
    title: "Onboarding y wizard inicial",
    status: "Base creada",
    summary: "Se inició el flujo de alta con selección de categoría y creación del primer Admin.",
  },
  {
    id: "hu-02",
    title: "Perfiles y permisos",
    status: "Base creada",
    summary: "CRUD de perfiles Editor, Lector y Participantes con pantalla admin.",
  },
  {
    id: "hu-03",
    title: "Participantes y ficha técnica",
    status: "Base creada",
    summary: "Alta de participantes, ficha técnica y asociación a planes económicos.",
  },
  {
    id: "hu-04",
    title: "Salones",
    status: "Base creada",
    summary: "Creación de salones y asignación de profesionales y participantes.",
  },
  {
    id: "hu-05",
    title: "Plantillas de bitácora",
    status: "En construcción",
    summary: "Formularios de registro por tipo: alimentación, actividades, emocional y más.",
  },
  {
    id: "hu-06",
    title: "Calendario y dashboard",
    status: "En construcción",
    summary: "Lista de eventos con filtro y panel de estadísticas para Admin.",
  },
  {
    id: "hu-07",
    title: "Chat interno",
    status: "En construcción",
    summary: "Mensajería con reglas de privacidad según rol y nombre de salón para Lector.",
  },
  {
    id: "hu-08",
    title: "Panel Editor",
    status: "En construcción",
    summary: "Listado de participantes, registros diarios y asignación múltiple (HU-18).",
  },
  {
    id: "hu-09",
    title: "Panel Apoderado",
    status: "En construcción",
    summary: "Vista de solo lectura de bitácoras, calendario y chat del salón.",
  },
];