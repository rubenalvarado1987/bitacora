import { TemplateField } from "../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Devuelve un icono de MaterialCommunityIcons según el tipo/etiqueta del campo.
export function getFieldIconName(field: TemplateField): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const label = (field.label || "").toLowerCase();

  // Priorizamos mapeos por palabras clave en la etiqueta
  if (label.includes("correo") || label.includes("email") || label.includes("e-mail")) return "email";
  if (label.includes("tel") || label.includes("fono") || label.includes("telefono") || label.includes("cel")) return "phone";
  if (label.includes("direc") || label.includes("direccion") || label.includes("calle")) return "map-marker";
  if (label.includes("comuna") || label.includes("ciudad")) return "city";
  if (label.includes("region") || label.includes("región")) return "map";
  if (label.includes("nota") || label.includes("comentario") || label.includes("observaci")) return "note-text";
  if (label.includes("peso")) return "scale-bathroom";
  if (label.includes("altura") || label.includes("talla")) return "human-male-height";
  if (label.includes("rut") || label.includes("id") || label.includes("identif")) return "card-account-details";

  // Mapeo por tipo
  switch (field.type) {
    case "text":
      return "text";
    case "number":
      return "numeric";
    case "date":
      return "calendar";
    case "time":
      return "clock";
    case "select":
      return "format-list-bulleted";
    case "scale":
      return "star";
    case "checklist":
      return "checkbox-multiple-outline";
    case "photo":
      return "camera";
    case "signature":
      return "signature";
    default:
      return "circle";
  }
}
