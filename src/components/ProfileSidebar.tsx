import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, shadow, spacing } from "../theme";
import AppIcon from "./AppIcon";
import { Person } from "../types";

const PROGRESS_COLORS = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#22C55E", "#14B8A6", "#06B6D4"];
const NO_INFO = "No informado";
type BaseValue = string | number | boolean;
type BaseData = Record<string, BaseValue>;

function getFirstText(data: BaseData, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return NO_INFO;
}

function parseBirthDate(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = raw.split(/[/-]/).map((p) => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const dayFirst = new Date(`${c}-${b}-${a}`);
    if (!Number.isNaN(dayFirst.getTime())) return dayFirst;
  }
  return null;
}

function getAgeValue(data: BaseData) {
  const explicitAge = getFirstText(data, "edad", "age");
  if (explicitAge !== NO_INFO) return explicitAge;
  const birthRaw = getFirstText(data, "fecha_nacimiento", "fechaNacimiento", "birthDate", "nacimiento");
  if (birthRaw === NO_INFO) return NO_INFO;
  const birthDate = parseBirthDate(birthRaw);
  if (!birthDate) return NO_INFO;
  const now = new Date();
  let years = now.getFullYear() - birthDate.getFullYear();
  const monthDelta = now.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birthDate.getDate())) {
    years -= 1;
  }
  return years >= 0 ? `${years} años` : NO_INFO;
}

function getRoomValue(
  person: Person,
  assignedSalonNames: string[],
  data: BaseData
) {
  if (assignedSalonNames.length > 0) {
    return assignedSalonNames.join(" · ");
  }
  const text = getFirstText(data, "sala", "salon", "salón", "curso");
  if (text !== NO_INFO) return text;
  if (person.salonIds && person.salonIds.length > 0) {
    return person.salonIds.length === 1 ? "1 sala asignada" : `${person.salonIds.length} salas asignadas`;
  }
  return NO_INFO;
}

function getAccessAccount(person: Person) {
  if (person.accountEmail?.trim()) return person.accountEmail.trim();
  return person.linkedUid ? "Cuenta vinculada" : "Sin cuenta";
}

function renderPersonAvatar(person: Person, initials: string) {
  if (person.photoUrl) {
    return <Image source={{ uri: person.photoUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarInitials}>{initials}</Text>
    </View>
  );
}

function renderRecentPhotos(recentPhotos: string[]) {
  if (recentPhotos.length > 0) {
    return recentPhotos.slice(0, 5).map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />);
  }
  return [0, 1, 2].map((i) => (
    <View key={i} style={[styles.photo, styles.photoPlaceholder]}>
      <AppIcon name="image-outline" size={16} color={colors.tealTint} />
    </View>
  ));
}

interface ProfileSidebarProps {
  person: Person;
  recentPhotos?: string[];
  assignedSalonNames?: string[];
}

// Card horizontal: avatar+nombre a la izq, secciones info en columnas a la derecha.
export default function ProfileSidebar({
  person,
  recentPhotos = [],
  assignedSalonNames = [],
}: Readonly<ProfileSidebarProps>) {
  const { width } = useWindowDimensions();
  const isMobile = width < 760;

  const initials = person.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const data: BaseData = person.baseData ?? {};
  const age = getAgeValue(data);
  const room = getRoomValue(person, assignedSalonNames, data);
  const guardian = getFirstText(
    data,
    "apoderado_principal",
    "nombre_apoderado",
    "apoderado",
    "apoderadoNombre",
    "contacto_emergencia_nombre"
  );
  const accessAccount = getAccessAccount(person);
  const emergencyContact = getFirstText(
    data,
    "contacto_emergencia_nombre",
    "emergencyContactName",
    "contacto_emergencia",
    "telefono_emergencia",
    "emergencyContactPhone"
  );

  const infoRows: Array<{ icon: React.ComponentProps<typeof AppIcon>["name"]; label: string; value: string }> = [
    { icon: "cake-variant", label: "Edad", value: age },
    { icon: "google-classroom", label: "Sala", value: room },
    { icon: "account-heart", label: "Apoderado", value: guardian },
    { icon: "account-key", label: "Acceso", value: accessAccount },
    { icon: "phone-alert", label: "Emergencia", value: emergencyContact },
  ];

  return (
    <View style={[styles.card, isMobile && styles.cardMobile]}>
      {/* Columna izquierda: avatar + nombre + estado */}
      <View style={[styles.avatarCol, isMobile && styles.avatarColMobile]}>
        <View style={styles.avatarWrap}>
          {renderPersonAvatar(person, initials)}
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
      <View style={[styles.divider, isMobile && styles.dividerMobile]} />

      {/* Columnas de secciones */}
      <View style={[styles.sectionsRow, isMobile && styles.sectionsRowMobile]}>
        {/* Desarrollo */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Desarrollo</Text>
            <Text style={[styles.sectionAction, isMobile && styles.sectionActionMobile]}>Gráfico</Text>
          </View>
          <View style={[styles.progressBar, isMobile && styles.progressBarMobile]}>
            {PROGRESS_COLORS.map((c) => (
              <View key={c} style={[styles.progressSegment, { backgroundColor: c }]} />
            ))}
            <View style={[styles.progressThumb, { left: "60%" }]} />
          </View>
        </View>

        <View style={[styles.sectionDivider, isMobile && styles.sectionDividerMobile]} />

        {/* Fotos recientes */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Fotos recientes</Text>
            <View style={styles.arrowRow}>
              <Pressable hitSlop={8}><AppIcon name="chevron-left" size={14} color={colors.slate} /></Pressable>
              <Pressable hitSlop={8}><AppIcon name="chevron-right" size={14} color={colors.slate} /></Pressable>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderRecentPhotos(recentPhotos)}
          </ScrollView>
        </View>

        <View style={[styles.sectionDivider, isMobile && styles.sectionDividerMobile]} />

        {/* Datos clave */}
        <View style={[styles.section, isMobile && styles.sectionMobile]}>
          <Text style={styles.sectionLabel}>Datos clave</Text>
          <View style={styles.infoList}>
            {infoRows.map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <AppIcon name={row.icon} size={15} color={colors.tealDark} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={isMobile ? 2 : 1}>{row.value}</Text>
                </View>
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
  cardMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 440,
  },
  // --- Columna avatar ---
  avatarCol: { alignItems: "center", width: 90 },
  avatarColMobile: { width: "100%", marginBottom: spacing.xs },
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
  dividerMobile: { width: "100%", height: 1, marginHorizontal: 0, marginVertical: spacing.sm },
  // --- Fila de secciones ---
  sectionsRow: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sectionsRowMobile: { width: "100%", flexDirection: "column", gap: spacing.xs },
  sectionDivider: { width: 1, alignSelf: "stretch", backgroundColor: colors.line },
  sectionDividerMobile: { width: "100%", height: 1 },
  section: { flex: 1, minWidth: 80 },
  sectionMobile: { width: "100%", minWidth: 0, flexGrow: 0, flexShrink: 1, flexBasis: "auto" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
  sectionAction: { fontSize: 10, color: colors.teal, fontWeight: "600" },
  sectionActionMobile: { opacity: 0, width: 0 },
  arrowRow: { flexDirection: "row", gap: 2 },
  progressBar: {
    flexDirection: "row",
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressBarMobile: { height: 5 },
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
  infoList: { marginTop: 2, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(20,184,166,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: { flex: 1, minWidth: 0 },
  infoLabel: { fontSize: 10, fontWeight: "700", color: colors.slate, textTransform: "uppercase" },
  infoValue: { fontSize: 11, fontWeight: "600", color: colors.ink, lineHeight: 15 },
});

