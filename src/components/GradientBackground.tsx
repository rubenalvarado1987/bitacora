import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradient } from "../theme";

// Fondo degradado fijo detrás de todas las pantallas (Stack usa contentStyle transparente).
export default function GradientBackground() {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={gradient.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}
