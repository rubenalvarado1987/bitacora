import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Entry } from "../types";
import { colors, radius, spacing } from "../theme";

export function EntryCard({ entry }: { entry: Entry }) {
  const fecha = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatFecha(fecha)}</Text>
        <Text style={styles.type}>{entry.type}</Text>
      </View>
      {Object.entries(entry.values).map(([key, value]) => (
        <Text key={key} style={styles.value}>
          {String(value)}
        </Text>
      ))}
      {entry.authorName ? <Text style={styles.author}>Registrado por {entry.authorName}</Text> : null}
    </View>
  );
}

function formatFecha(fecha: Date) {
  return fecha.toLocaleString("es-419", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  date: { fontSize: 11, color: colors.slate, fontVariant: ["tabular-nums"] },
  type: { fontSize: 11, color: colors.tealDark, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 13, color: colors.ink, marginTop: 2 },
  author: { fontSize: 11, color: colors.slate, marginTop: spacing.xs },
});
