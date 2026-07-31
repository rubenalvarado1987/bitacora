import { BusinessCategoryId, Template, TemplateSection } from "../types";

export interface BusinessCategoryDefinition {
  id: BusinessCategoryId;
  label: string;
  description: string;
  modules: string[];
}

export const businessCategories: BusinessCategoryDefinition[] = [
  {
    id: "jardin-infantil",
    label: "Jardín Infantil",
    description: "Bitácoras diarias, salones, chat por grupo y seguimiento de apoderados.",
    modules: ["wizard", "perfiles", "participantes", "salones", "bitacoras", "calendario", "chat"],
  },
  {
    id: "casa-de-reposo",
    label: "Casa de Reposo",
    description: "Seguimiento clínico, medicación, alimentación y registro de cuidados.",
    modules: ["wizard", "perfiles", "participantes", "bitacoras", "calendario", "chat"],
  },
  {
    id: "hotel-de-mascotas",
    label: "Hotel de Mascotas",
    description: "Control de alimentación, actividad, higiene y registros de atención diaria.",
    modules: ["wizard", "perfiles", "participantes", "bitacoras", "calendario", "chat"],
  },
  {
    id: "gym",
    label: "Gym",
    description: "Seguimiento de rutinas, asistencia, metas y avances físicos.",
    modules: ["wizard", "perfiles", "participantes", "bitacoras", "calendario", "chat"],
  },
  {
    id: "profesional-a-domicilio",
    label: "Profesional a Domicilio",
    description: "Registro de visitas, tareas, evidencias y comunicación con apoderados.",
    modules: ["wizard", "perfiles", "participantes", "bitacoras", "calendario", "chat"],
  },
];

const sharedBaseSections: TemplateSection[] = [
  {
    id: "datos-demograficos",
    title: "Datos demográficos",
    fields: [
      { id: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date", required: true },
      {
        id: "sexo",
        label: "Sexo / género",
        type: "select",
        options: ["Femenino", "Masculino", "Otro", "Prefiero no decir"],
      },
      { id: "direccion", label: "Dirección", type: "text" },
    ],
  },
  {
    id: "datos-personales",
    title: "Datos personales",
    fields: [
      { id: "nombre_completo", label: "Nombre completo", type: "text", required: true },
      { id: "rut", label: "RUT / documento", type: "text" },
      { id: "telefono", label: "Teléfono", type: "text" },
    ],
  },
  {
    id: "relacion-parental",
    title: "Relación parental",
    fields: [
      { id: "apoderado_principal", label: "Apoderado principal", type: "text" },
      { id: "parentesco", label: "Parentesco", type: "text" },
      { id: "telefono_apoderado", label: "Teléfono apoderado", type: "text" },
    ],
  },
  {
    id: "alergias",
    title: "Alergias",
    fields: [{ id: "alergias", label: "Alergias", type: "text" }],
  },
  {
    id: "medicamentos",
    title: "Medicamentos",
    fields: [{ id: "medicamentos", label: "Medicamentos habituales", type: "text" }],
  },
  {
    id: "otros",
    title: "Otros",
    fields: [{ id: "observaciones", label: "Observaciones", type: "text" }],
  },
];

const sharedEntrySections: TemplateSection[] = [
  {
    id: "alimentacion",
    title: "Alimentación",
    fields: [
      {
        id: "tipo_comida",
        label: "Tipo de comida",
        type: "select",
        options: ["Desayuno", "Almuerzo", "Cena", "Colaciones"],
        required: true,
      },
      { id: "descripcion", label: "Descripción", type: "text", required: true },
      {
        id: "cantidad_consumida",
        label: "Cantidad consumida",
        type: "select",
        options: ["Menos de la mitad", "La mitad", "Más de la mitad", "Todo"],
        required: true,
      },
    ],
  },
  {
    id: "actividades",
    title: "Actividades",
    fields: [
      {
        id: "tipo_actividad",
        label: "Tipo de actividad",
        type: "select",
        options: ["Académico", "Recreativo", "Grupal", "Física", "Extra programático"],
        required: true,
      },
      { id: "detalle", label: "Detalle", type: "text" },
      { id: "adjuntos", label: "Adjuntos", type: "photo" },
    ],
  },
  {
    id: "asistencia",
    title: "Asistencia",
    fields: [
      {
        id: "estado_asistencia",
        label: "Asistencia",
        type: "select",
        options: ["Presente", "Ausente"],
        required: true,
      },
      { id: "fecha", label: "Fecha", type: "date", required: true },
    ],
  },
  {
    id: "emocional",
    title: "Emocional",
    fields: [
      {
        id: "estado_animo",
        label: "Estado de ánimo",
        type: "select",
        options: ["😊", "😐", "😢", "😡"],
        required: true,
      },
      { id: "observaciones", label: "Observaciones", type: "text" },
    ],
  },
  {
    id: "descanso",
    title: "Descanso",
    fields: [{ id: "duracion_siesta", label: "Duración de la siesta", type: "time" }],
  },
  {
    id: "higiene",
    title: "Higiene",
    fields: [
      { id: "mudas_cantidad", label: "Cantidad de mudas", type: "number" },
      { id: "mudas_hora", label: "Hora de las mudas", type: "time" },
      {
        id: "lavado_dientes",
        label: "Lavado de dientes",
        type: "select",
        options: ["Sí", "No"],
      },
      { id: "lavado_dientes_hora", label: "Hora de lavado de dientes", type: "time" },
    ],
  },
  {
    id: "medicamentos-registro",
    title: "Medicamentos",
    fields: [
      { id: "nombre_medicamento", label: "Nombre del medicamento", type: "text", required: true },
      { id: "dosis", label: "Dosis", type: "text", required: true },
      { id: "horarios", label: "Horarios", type: "text", required: true },
      { id: "fecha_vencimiento", label: "Fecha de vencimiento", type: "date", required: true },
      { id: "prescripcion", label: "Prescripción médica", type: "photo" },
    ],
  },
  {
    id: "extras",
    title: "Extras",
    fields: [{ id: "texto_libre", label: "Texto libre", type: "text" }],
  },
];

export function getBusinessCategory(categoryId: BusinessCategoryId) {
  const category = businessCategories.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error(`No existe la categoría ${categoryId}`);
  }

  return category;
}

export const entryTemplateSections = sharedEntrySections;

export function buildStarterTemplate(categoryId: BusinessCategoryId): Template {
  const category = getBusinessCategory(categoryId);

  return {
    id: `${categoryId}-template`,
    rubro: categoryId,
    name: `Ficha inicial · ${category.label}`,
    version: 1,
    baseSections: sharedBaseSections,
    entrySections: sharedEntrySections,
  };
}