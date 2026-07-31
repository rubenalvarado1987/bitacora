import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Person } from "../types";
import { colors, radius, spacing } from "../theme";

export function PersonCard({ person, onPress }: { person: Person; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(person.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.status}>{person.status === "activo" ? "Activo" : "Inactivo"}</Text>
      </View>
    </Pressable>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.tealDark, fontWeight: "600" },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  status: { fontSize: 12, color: colors.slate, marginTop: 2 },
});
