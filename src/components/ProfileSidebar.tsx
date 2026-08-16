import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, shadow, spacing } from "../theme";
import AppIcon from "./AppIcon";
import { Person } from "../types";

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
  showExtendedKeyInfo?: boolean;
  attendanceMonthPercent?: number | null;
  attendanceYearPercent?: number | null;
  emotionalStateLabel?: string | null;
  emotionalTrend?: number[];
}

// Card horizontal: avatar+nombre a la izq, secciones info en columnas a la derecha.
export default function ProfileSidebar({
  person,
  recentPhotos = [],
  assignedSalonNames = [],
  showExtendedKeyInfo = false,
  attendanceMonthPercent = null,
  attendanceYearPercent = null,
  emotionalStateLabel = null,
  emotionalTrend = [],
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
  const allergies = getFirstText(data, "alergias", "alergia", "alergias_medicamentos");
  const healthCondition = getFirstText(data, "condicion_salud", "antecedentes_salud", "diagnostico", "enfermedades_base", "prevision_salud", "centro_salud");
  const authorizedPickup = getFirstText(data, "personas_autorizadas_retiro", "autorizados_retiro", "retiro_autorizado");

  const infoRows: Array<{ icon: React.ComponentProps<typeof AppIcon>["name"]; label: string; value: string }> = [
    { icon: "cake-variant", label: "Edad", value: age },
    { icon: "google-classroom", label: "Sala", value: room },
    { icon: "account-heart", label: "Apoderado", value: guardian },
    { icon: "account-key", label: "Acceso", value: accessAccount },
    { icon: "phone-alert", label: "Emergencia", value: emergencyContact },
  ];

  const importantRows: Array<{ icon: React.ComponentProps<typeof AppIcon>["name"]; label: string; value: string }> = [
    { icon: "alert-circle-outline", label: "Alergias", value: allergies },
    { icon: "heart-pulse", label: "Salud", value: healthCondition },
    { icon: "phone-alert", label: "Emergencia", value: emergencyContact },
    { icon: "account-check-outline", label: "Retiro", value: authorizedPickup },
  ];

  const fullFichaRows = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase()),
      value: String(value),
    }));

  const [showMoreInfo, setShowMoreInfo] = React.useState(false);

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
          <View style={styles.kpiList}>
            <KpiRow
              label="Asistencia mes"
              value={attendanceMonthPercent == null ? "--%" : `${attendanceMonthPercent}%`}
              ratio={attendanceMonthPercent == null ? 0 : attendanceMonthPercent / 100}
              color="#0F766E"
            />
            <KpiRow
              label="Asistencia año"
              value={attendanceYearPercent == null ? "--%" : `${attendanceYearPercent}%`}
              ratio={attendanceYearPercent == null ? 0 : attendanceYearPercent / 100}
              color="#0369A1"
            />
            <EmotionalRow
              label="Estado emocional"
              stateLabel={emotionalStateLabel || "No informado"}
              trend={emotionalTrend}
            />
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
            {(showExtendedKeyInfo ? importantRows : infoRows).map((row) => (
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
          {showExtendedKeyInfo ? (
            <>
              <Pressable style={styles.moreInfoBtn} onPress={() => setShowMoreInfo((prev) => !prev)}>
                <AppIcon name={showMoreInfo ? "chevron-up" : "chevron-down"} size={14} color={colors.teal} />
                <Text style={styles.moreInfoText}>{showMoreInfo ? "Ocultar info" : "+ info"}</Text>
              </Pressable>
              {showMoreInfo ? (
                <View style={styles.fullInfoBox}>
                  {fullFichaRows.length === 0 ? (
                    <Text style={styles.fullInfoEmpty}>Sin datos adicionales.</Text>
                  ) : (
                    fullFichaRows.map((row) => (
                      <View key={row.key} style={styles.fullInfoRow}>
                        <Text style={styles.fullInfoKey}>{row.label}</Text>
                        <Text style={styles.fullInfoValue}>{row.value}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function KpiRow({
  label,
  value,
  ratio,
  color,
}: {
  label: string;
  value: string;
  ratio: number;
  color: string;
}) {
  const safeRatio = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.kpiRow}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
      <View style={styles.kpiTrack}>
        <View style={[styles.kpiFill, { width: `${Math.round(safeRatio * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function EmotionalRow({
  label,
  stateLabel,
  trend,
}: {
  label: string;
  stateLabel: string;
  trend: number[];
}) {
  const fallback = [0.3, 0.45, 0.4, 0.55, 0.5];
  const chart = trend.length > 0 ? trend.map((v) => Math.max(0.05, Math.min(1, v / 100))) : fallback;
  return (
    <View style={styles.kpiRow}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue} numberOfLines={1}>{stateLabel}</Text>
      </View>
      <View style={styles.emotionChart}>
        {chart.slice(-7).map((v, index) => (
          <View key={`${index}-${v}`} style={styles.emotionBarWrap}>
            <View style={[styles.emotionBar, { height: `${Math.round(v * 100)}%` }]} />
          </View>
        ))}
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
  kpiList: { gap: 8 },
  kpiRow: { gap: 4 },
  kpiHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  kpiLabel: { fontSize: 10, color: colors.slate, fontWeight: "700", textTransform: "uppercase" },
  kpiValue: { fontSize: 11, color: colors.ink, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  kpiTrack: {
    width: "100%",
    height: 7,
    borderRadius: 6,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  kpiFill: { height: "100%", borderRadius: 6 },
  emotionChart: {
    width: "100%",
    height: 36,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  emotionBarWrap: {
    flex: 1,
    height: "100%",
    backgroundColor: colors.line,
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  emotionBar: {
    width: "100%",
    backgroundColor: "#1E40AF",
    borderRadius: 4,
    minHeight: 4,
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
  moreInfoBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  moreInfoText: { fontSize: 12, fontWeight: "700", color: colors.teal },
  fullInfoBox: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 6,
  },
  fullInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  fullInfoKey: { fontSize: 11, color: colors.slate, fontWeight: "700", minWidth: 120 },
  fullInfoValue: { fontSize: 11, color: colors.ink, flex: 1 },
  fullInfoEmpty: { fontSize: 11, color: colors.slate },
});

