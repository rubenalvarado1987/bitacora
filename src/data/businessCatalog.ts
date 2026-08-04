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
      {
        id: "parentesco",
        label: "Parentesco",
        type: "select",
        options: ["Padre", "Madre", "Padrastro", "Madrastra", "Tutor/a legal", "Apoderado/a (sin parentesco biológico)", "Pareja", "Cónyuge", "Abuela", "Abuelo"],
      },
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

// Ficha completa de matrícula para Jardín Infantil (HU específica del rubro).
const jardinInfantilBaseSections: TemplateSection[] = [
  {
    id: "datos-nino",
    title: "Datos del niño/a",
    fields: [
      { id: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date", required: true },
      { id: "edad", label: "Edad", type: "number" },
      { id: "rut", label: "RUT o documento de identidad", type: "text" },
      { id: "nacionalidad", label: "Nacionalidad", type: "text" },
      { id: "sexo", label: "Sexo", type: "select", options: ["Femenino", "Masculino", "Otro"] },
      { id: "direccion", label: "Dirección particular", type: "text" },
      {
        id: "nivel_sala",
        label: "Nivel/sala al que ingresa",
        type: "select",
        options: ["Sala cuna", "Medio menor", "Medio mayor", "Prekínder", "Kínder"],
        required: true,
      },
      { id: "fecha_ingreso", label: "Fecha de ingreso", type: "date" },
      { id: "fotografia", label: "Fotografía", type: "photo" },
      {
        id: "grupo_sanguineo",
        label: "Grupo sanguíneo",
        type: "select",
        options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      },
    ],
  },
  {
    id: "datos-apoderados",
    title: "Datos de los padres o apoderados",
    fields: [
      { id: "nombre_apoderado", label: "Nombre completo del padre/madre/apoderado", type: "text", required: true },
      { id: "rut_apoderado", label: "RUT del apoderado", type: "text" },
      {
        id: "parentesco_apoderado",
        label: "Parentesco con el niño/a",
        type: "select",
        options: ["Padre", "Madre", "Padrastro", "Madrastra", "Tutor/a legal", "Apoderado/a (sin parentesco biológico)", "Pareja", "Cónyuge", "Abuela", "Abuelo"],
      },
      { id: "telefono_movil", label: "Teléfono móvil", type: "text" },
      { id: "telefono_fijo", label: "Teléfono fijo", type: "text" },
      { id: "correo_apoderado", label: "Correo electrónico", type: "text" },
      { id: "direccion_apoderado", label: "Dirección (si es distinta a la del niño/a)", type: "text" },
      { id: "ocupacion_apoderado", label: "Ocupación / lugar de trabajo", type: "text" },
      { id: "horario_laboral", label: "Horario laboral", type: "text" },
      {
        id: "estado_civil_padres",
        label: "Estado civil de los padres",
        type: "select",
        options: ["Soltero/a", "Casado/a", "Conviviente civil", "Separado/a", "Divorciado/a", "Viudo/a"],
      },
      { id: "estructura_familiar", label: "Con quién vive el niño/a", type: "text" },
    ],
  },
  {
    id: "contactos-emergencia",
    title: "Contactos de emergencia",
    fields: [
      { id: "contacto_emergencia_nombre", label: "Nombre de contacto adicional", type: "text" },
      { id: "contacto_emergencia_telefono", label: "Teléfono", type: "text" },
      {
        id: "contacto_emergencia_parentesco",
        label: "Parentesco o relación con el niño/a",
        type: "select",
        options: ["Padre", "Madre", "Padrastro", "Madrastra", "Tutor/a legal", "Apoderado/a (sin parentesco biológico)", "Pareja", "Cónyuge", "Abuela", "Abuelo"],
      },
      { id: "personas_autorizadas_retiro", label: "Personas autorizadas para retirar (nombres y RUT)", type: "text" },
    ],
  },
  {
    id: "antecedentes-salud",
    title: "Antecedentes de salud",
    fields: [
      { id: "prevision_salud", label: "Previsión de salud", type: "select", options: ["Isapre", "Fonasa"] },
      { id: "centro_salud", label: "Centro de salud u hospital de referencia", type: "text" },
      { id: "medico_tratante", label: "Médico tratante", type: "text" },
      { id: "alergias", label: "Alergias (alimentarias, medicamentos, otras)", type: "text" },
      { id: "enfermedades_cronicas", label: "Enfermedades crónicas o condiciones especiales", type: "text" },
      { id: "medicamentos_habituales", label: "Medicamentos que toma regularmente", type: "text" },
      { id: "vacunas_al_dia", label: "Vacunas al día", type: "select", options: ["Sí", "No"] },
      { id: "necesidades_especiales", label: "Necesidades educativas especiales o diagnósticos", type: "text" },
      { id: "restricciones_alimentarias", label: "Restricciones alimentarias o dieta especial", type: "text" },
    ],
  },
  {
    id: "datos-administrativos",
    title: "Datos administrativos",
    fields: [
      { id: "matricula", label: "N° de matrícula o folio", type: "text" },
      { id: "establecimiento_procedencia", label: "Establecimiento de procedencia", type: "text" },
      {
        id: "tipo_financiamiento",
        label: "Tipo de financiamiento",
        type: "select",
        options: ["Particular", "JUNJI", "Integra", "Subvencionado"],
      },
      { id: "documentos_entregados", label: "Documentos entregados", type: "text" },
    ],
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
  const baseSections = categoryId === "jardin-infantil" ? jardinInfantilBaseSections : sharedBaseSections;

  return {
    id: `${categoryId}-template`,
    rubro: categoryId,
    name: `Ficha inicial · ${category.label}`,
    version: 1,
    baseSections,
    entrySections: sharedEntrySections,
  };
}