import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing } from "../theme";
import AppIcon from "./AppIcon";
import { Entry } from "../types";

interface DailySummaryCardProps {
  entries: Entry[];
  personName: string;
}

// Genera un resumen de texto a partir de los registros del día (sin llamada a API externa).
function buildSummary(entries: Entry[], name: string): string {
  if (entries.length === 0) return `No hay registros del día para ${name} aún.`;

  const tipos = [...new Set(entries.map((e) => e.type.toLowerCase()))];
  const asistencia = entries.find((e) => e.type === "Asistencia");
  const presente = asistencia?.values?.estado_asistencia === "Presente" || asistencia?.values?.Asistencia === "Presente";
  const emocional = entries.find((e) => e.type === "Emocional");
  const estado = emocional?.values?.estado_animo;
  const alimentacion = entries.find((e) => e.type === "Alimentación");
  const comida = alimentacion?.values?.tipo_comida ?? alimentacion?.values?.descripcion;

  const partes: string[] = [];
  if (presente) partes.push(`${name} asistió hoy.`);
  if (estado) partes.push(`Su estado emocional fue "${estado}".`);
  if (comida) partes.push(`En alimentación se registró ${comida}.`);
  if (tipos.length > 0) {
    partes.push(`Hoy se registraron: ${tipos.join(", ")}.`);
  }
  return partes.join(" ") || `${name} tiene ${entries.length} registro(s) hoy.`;
}

// Card de resumen diario generado localmente (puede extenderse para llamar a un LLM en el futuro).
export default function DailySummaryCard({ entries, personName }: Readonly<DailySummaryCardProps>) {
  const todayEntries = useMemo(() => {
    const today = new Date();
    return entries.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : null;
      if (!d) return false;
      return d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate();
    });
  }, [entries]);

  const summary = useMemo(() => buildSummary(todayEntries, personName), [todayEntries, personName]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppIcon name="star-four-points" size={18} color={colors.teal} />
          <Text style={styles.title}>Daily Summary</Text>
        </View>
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      </View>
      <Text style={styles.body}>{summary}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  aiBadge: {
    backgroundColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700", color: colors.slate },
  body: { fontSize: 13, color: colors.slate, lineHeight: 20 },
});
