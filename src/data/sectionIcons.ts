import { MaterialCommunityIcons } from "@expo/vector-icons";

// Mapea el id/título de una sección de entrada a un icono de MaterialCommunityIcons
export function getSectionIconName(sectionIdOrTitle: string):
  React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const key = (sectionIdOrTitle || "").toLowerCase();

  if (key.includes("aliment")) return "silverware-fork-knife";
  if (key.includes("activ")) return "run";
  if (key.includes("asist")) return "account-check";
  if (key.includes("emocion") || key.includes("ánim") || key.includes("animo")) return "emoticon-happy";
  if (key.includes("descans") || key.includes("siesta") || key.includes("dorm")) return "sleep";
  if (key.includes("higien") || key.includes("higiene") || key.includes("baño")) return "shower";
  if (key.includes("medic") || key.includes("medicamento")) return "pill";
  if (key.includes("extra") || key.includes("otros")) return "plus-box";

  return "circle";
}
