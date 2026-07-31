import { Template } from "../types";

// Estas plantillas son el punto de partida para cada rubro.
// Un administrador puede editarlas después desde la pantalla "Plantilla".
export const seedTemplates: Record<string, Template> = {
  colegio: {
    id: "colegio",
    rubro: "colegio",
    name: "Ficha de alumno",
    version: 1,
    baseSections: [
      {
        id: "datos-generales",
        title: "Datos generales",
        fields: [
          { id: "apoderado", label: "Apoderado", type: "text", required: true },
          { id: "curso", label: "Curso", type: "text", required: true },
          { id: "necesidad_especial", label: "Necesidad especial", type: "text" },
        ],
      },
    ],
    entrySections: [
      {
        id: "seguimiento",
        title: "Registro diario",
        fields: [
          {
            id: "tipo",
            label: "Tipo de registro",
            type: "select",
            options: ["Asistencia", "Conducta", "Avance académico", "Incidente"],
            required: true,
          },
          { id: "nota", label: "Observación", type: "text", required: true },
        ],
      },
    ],
  },

  hogar: {
    id: "hogar",
    rubro: "hogar",
    name: "Ficha de residente",
    version: 1,
    baseSections: [
      {
        id: "datos-clinicos",
        title: "Datos clínicos",
        fields: [
          { id: "alergias", label: "Alergias", type: "text" },
          {
            id: "dependencia",
            label: "Grado de dependencia",
            type: "select",
            options: ["Leve", "Moderada", "Alta"],
            required: true,
          },
          { id: "contacto_emergencia", label: "Contacto de emergencia", type: "text", required: true },
        ],
      },
    ],
    entrySections: [
      {
        id: "medicacion",
        title: "Medicación",
        fields: [
          { id: "medicamento", label: "Medicamento administrado", type: "text", required: true },
          { id: "hora", label: "Hora de administración", type: "time", required: true },
          { id: "observacion", label: "Observación", type: "text" },
        ],
      },
      {
        id: "cuidados",
        title: "Comidas e higiene",
        fields: [
          {
            id: "tipo",
            label: "Tipo",
            type: "select",
            options: ["Comida", "Higiene", "Signos vitales", "Visita"],
            required: true,
          },
          { id: "detalle", label: "Detalle", type: "text" },
        ],
      },
    ],
  },

  gimnasio: {
    id: "gimnasio",
    rubro: "gimnasio",
    name: "Ficha de socio",
    version: 1,
    baseSections: [
      {
        id: "objetivo",
        title: "Objetivo",
        fields: [
          { id: "meta", label: "Meta", type: "text", required: true },
          { id: "lesion_previa", label: "Lesión previa", type: "text" },
        ],
      },
    ],
    entrySections: [
      {
        id: "sesion",
        title: "Registro de sesión",
        fields: [
          {
            id: "tipo",
            label: "Tipo",
            type: "select",
            options: ["Rutina", "Medidas", "Asistencia"],
            required: true,
          },
          { id: "detalle", label: "Detalle (cargas, peso, etc.)", type: "text", required: true },
          { id: "esfuerzo_percibido", label: "Esfuerzo percibido (1-5)", type: "scale" },
        ],
      },
    ],
  },

  psicologia: {
    id: "psicologia",
    rubro: "psicologia",
    name: "Ficha clínica",
    version: 1,
    baseSections: [
      {
        id: "ingreso",
        title: "Motivo de consulta",
        fields: [
          { id: "motivo", label: "Motivo de ingreso", type: "text", required: true },
          {
            id: "consentimiento",
            label: "Consentimiento informado",
            type: "select",
            options: ["Firmado", "Pendiente"],
            required: true,
          },
        ],
      },
    ],
    entrySections: [
      {
        id: "sesion",
        title: "Nota de sesión",
        fields: [
          { id: "numero_sesion", label: "N° de sesión", type: "number", required: true },
          { id: "nota", label: "Nota clínica", type: "text", required: true },
          { id: "tarea", label: "Tarea entre sesiones", type: "text" },
        ],
      },
    ],
  },
};
