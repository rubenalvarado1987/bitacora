import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme";

interface AppIconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  size?: number;
  color?: string;
}

export default function AppIcon({ name, size = 18, color = colors.slate }: Readonly<AppIconProps>) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
