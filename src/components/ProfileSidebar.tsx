import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing } from "../theme";
import AppIcon from "./AppIcon";
import { Person } from "../types";

const BADGE_ICONS: React.ComponentProps<typeof AppIcon>["name"][] = [
  "star-circle",
  "medal",
  "trophy",
  "shield-star",
];
const BADGE_COLORS = [colors.amber, "#FFD700", "#F59E0B", colors.teal];

const PROGRESS_COLORS = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#22C55E", "#14B8A6", "#06B6D4"];

interface ProfileSidebarProps {
  person: Person;
  recentPhotos?: string[];
}

// Card horizontal: avatar+nombre a la izq, secciones info en columnas a la derecha.
export default function ProfileSidebar({ person, recentPhotos = [] }: Readonly<ProfileSidebarProps>) {
  const initials = person.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.card}>
      {/* Columna izquierda: avatar + nombre + estado */}
      <View style={styles.avatarCol}>
        <View style={styles.avatarWrap}>
          {person.photoUrl ? (
            <Image source={{ uri: person.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, person.status === "activo" ? styles.onlineDotActive : styles.onlineDotInactive]} />
        </View>
        <Text style={styles.name} numberOfLines={2}>{person.name}</Text>
        <View style={[styles.statusBadge, person.status === "activo" ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
          <Text style={[styles.statusText, person.status === "activo" ? styles.statusTextActive : styles.statusTextInactive]}>
            {person.status === "activo" ? "Activo" : "Inactivo"}
          </Text>
        </View>
      </View>

      {/* Divisor vertical */}
      <View style={styles.divider} />

      {/* Columnas de secciones */}
      <View style={styles.sectionsRow}>
        {/* Desarrollo */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Desarrollo</Text>
            <Text style={styles.sectionAction}>Gráfico</Text>
          </View>
          <View style={styles.progressBar}>
            {PROGRESS_COLORS.map((c) => (
              <View key={c} style={[styles.progressSegment, { backgroundColor: c }]} />
            ))}
            <View style={[styles.progressThumb, { left: "60%" }]} />
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Fotos recientes */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Fotos recientes</Text>
            <View style={styles.arrowRow}>
              <Pressable hitSlop={8}><AppIcon name="chevron-left" size={14} color={colors.slate} /></Pressable>
              <Pressable hitSlop={8}><AppIcon name="chevron-right" size={14} color={colors.slate} /></Pressable>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentPhotos.length > 0
              ? recentPhotos.slice(0, 5).map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.photo} />
                ))
              : [0, 1, 2].map((i) => (
                  <View key={i} style={[styles.photo, styles.photoPlaceholder]}>
                    <AppIcon name="image-outline" size={16} color={colors.tealTint} />
                  </View>
                ))}
          </ScrollView>
        </View>

        <View style={styles.sectionDivider} />

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Badges</Text>
          <View style={styles.badgesRow}>
            {BADGE_ICONS.map((icon, i) => (
              <View key={icon} style={[styles.badgeCircle, { backgroundColor: `${BADGE_COLORS[i]}22` }]}>
                <AppIcon name={icon} size={20} color={BADGE_COLORS[i]} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  // --- Columna avatar ---
  avatarCol: { alignItems: "center", width: 90 },
  avatarWrap: { position: "relative", marginBottom: spacing.xs },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: "#fff" },
  avatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 22, fontWeight: "700", color: colors.tealDark },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineDotActive: { backgroundColor: "#22C55E" },
  onlineDotInactive: { backgroundColor: colors.slate },
  name: { fontSize: 12, fontWeight: "700", color: colors.ink, textAlign: "center", marginBottom: 4 },
  statusBadge: {
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusBadgeActive: { backgroundColor: "#E3F6EA" },
  statusBadgeInactive: { backgroundColor: "#F1F1F3" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextActive: { color: "#1E7A3F" },
  statusTextInactive: { color: colors.slate },
  // --- Divisor avatar/secciones ---
  divider: { width: 1, height: "100%", backgroundColor: colors.line, marginHorizontal: spacing.sm },
  // --- Fila de secciones ---
  sectionsRow: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sectionDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.line },
  section: { flex: 1, minWidth: 80 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
  sectionAction: { fontSize: 10, color: colors.teal, fontWeight: "600" },
  arrowRow: { flexDirection: "row", gap: 2 },
  progressBar: {
    flexDirection: "row",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressSegment: { flex: 1 },
  progressThumb: {
    position: "absolute",
    top: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: colors.ink,
    marginLeft: -7,
  },
  photo: { width: 62, height: 62, borderRadius: 10, marginRight: spacing.xs },
  photoPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  badgesRow: { flexDirection: "row", gap: 6, marginTop: spacing.xs, flexWrap: "wrap" },
  badgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

