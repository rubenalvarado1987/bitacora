import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import AppIcon from "./AppIcon";
import { colors, radius, shadow, spacing } from "../theme";
import { Entry } from "../types";

// Configuración semántica de color e ícono por tipo de registro
const CATEGORY: Record<string, {
  color: string;
  bg: string;
  border: string;
  iconName: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
}> = {
  Alimentación: { color: "#C53030", bg: "#FFEEEE", border: "#FCA5A5", iconName: "silverware-fork-knife", label: "ALIMENTACIÓN" },
  Asistencia:   { color: "#166534", bg: "#DCFCE7", border: "#86EFAC", iconName: "account-check", label: "ASISTENCIA" },
  Actividades:  { color: "#9A3412", bg: "#FFF0E6", border: "#FDBA74", iconName: "run", label: "ACTIVIDADES" },
  Emocional:    { color: "#1E40AF", bg: "#EFF6FF", border: "#93C5FD", iconName: "emoticon-happy", label: "EMOCIONAL" },
  Descanso:     { color: "#5B21B6", bg: "#F5F3FF", border: "#C4B5FD", iconName: "sleep", label: "DESCANSO" },
  Higiene:      { color: "#0F766E", bg: "#F0FDFA", border: "#5EEAD4", iconName: "shower", label: "HIGIENE" },
  Medicamentos: { color: "#0369A1", bg: "#F0F9FF", border: "#7DD3FC", iconName: "pill", label: "MEDICAMENTOS" },
  Extras:       { color: "#374151", bg: "#F9FAFB", border: "#D1D5DB", iconName: "plus-box", label: "EXTRAS" },
};

const DEFAULT_CAT = {
  color: colors.slate,
  bg: colors.card,
  border: colors.line,
  iconName: "circle" as React.ComponentProps<typeof AppIcon>["name"],
  label: "REGISTRO",
};

function getCategory(type: string) {
  // Búsqueda exacta primero, luego por inclusión de palabra clave
  if (CATEGORY[type]) return CATEGORY[type];
  const key = Object.keys(CATEGORY).find((k) => type.toLowerCase().includes(k.toLowerCase()));
  return key ? CATEGORY[key] : DEFAULT_CAT;
}

function formatFecha(fecha: Date) {
  return fecha.toLocaleString("es-419", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface TimelineEntryCardProps {
  entry: Entry;
  isLast: boolean;
}

export function TimelineEntryCard({ entry, isLast }: Readonly<TimelineEntryCardProps>) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const cat = getCategory(entry.type);
  const fecha = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date();
  const valueEntries = Object.entries(entry.values ?? {});

  return (
    <View style={styles.row}>
      {/* Línea vertical + nodo de color */}
      <View style={styles.timeline}>
        <View style={[styles.node, { backgroundColor: cat.color, shadowColor: cat.color }]} />
        {!isLast ? <View style={styles.connector} /> : null}
      </View>

      {/* Card del registro */}
      <View style={[styles.card, { borderColor: cat.border }]}>
        {/* Badge de categoría */}
        <View style={[styles.badge, { backgroundColor: cat.bg }]}>
          <AppIcon name={cat.iconName} size={12} color={cat.color} />
          <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>

        {/* Ícono grande de categoría + contenido textual */}
        <View style={styles.contentRow}>
          <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
            <AppIcon name={cat.iconName} size={24} color={cat.color} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.date}>{formatFecha(fecha)}</Text>
            {valueEntries.slice(0, 3).map(([, val]) => (
              <Text key={String(val)} style={styles.value}>{String(val)}</Text>
            ))}
            {entry.authorName ? (
              <Text style={styles.author}>Registrado por {entry.authorName}</Text>
            ) : null}
          </View>

          {/* Acciones rápidas */}
          <View style={styles.actions}>
            <Pressable onPress={() => setPopoverVisible(true)} style={styles.actionBtn} hitSlop={6}>
              <AppIcon name="dots-horizontal" size={16} color={colors.slate} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Popover de detalles rápidos */}
      {popoverVisible ? (
        <Modal transparent animationType="fade" onRequestClose={() => setPopoverVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setPopoverVisible(false)}>
            <View style={styles.popover}>
              <Text style={styles.popoverTitle}>{cat.label}</Text>
              {valueEntries.map(([key, val]) => (
                <View key={key} style={styles.popoverRow}>
                  <AppIcon name={cat.iconName} size={14} color={colors.slate} />
                  <Text style={styles.popoverKey}>{key}:</Text>
                  <Text style={styles.popoverVal}>{String(val)}</Text>
                </View>
              ))}
              {entry.authorName ? (
                <View style={styles.popoverRow}>
                  <AppIcon name="account-outline" size={14} color={colors.slate} />
                  <Text style={styles.popoverKey}>Autor:</Text>
                  <Text style={styles.popoverVal}>{entry.authorName}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: spacing.md },
  // --- Timeline vertical ---
  timeline: { width: 28, alignItems: "center" },
  node: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 18,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    zIndex: 1,
  },
  connector: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  // --- Card ---
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.soft,
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginBottom: spacing.xs,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  // --- Contenido ---
  contentRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  date: { fontSize: 11, color: colors.slate, fontVariant: ["tabular-nums"] },
  value: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 2 },
  author: { fontSize: 11, color: colors.slate, marginTop: spacing.xs },
  // --- Acciones ---
  actions: { justifyContent: "center" },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  // --- Popover ---
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)", justifyContent: "center", padding: spacing.xl },
  popover: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  popoverTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.tealDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  popoverRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 6 },
  popoverKey: { fontSize: 12, color: colors.slate, flex: 1 },
  popoverVal: { fontSize: 12, fontWeight: "600", color: colors.ink },
});
