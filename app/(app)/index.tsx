import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { listenJornadas, listenMyProfile, listenParticipants, listenPlans, listenProfiles, listenSalons } from "../../src/data/adminRepository";
import { EconomicPlan, Jornada, Person, ProfileRecord, Salon, SalonEducationalLevel } from "../../src/types";
import { colors, radius, spacing } from "../../src/theme";
import Breadcrumb from "../../src/components/Breadcrumb";
import AppIcon from "../../src/components/AppIcon";

const EDUCATIONAL_LEVEL_LABELS: Record<SalonEducationalLevel, string> = {
  sala_cuna_menor: "Sala Cuna Menor",
  sala_cuna_mayor: "Sala Cuna Mayor",
  medio_menor: "Medio Menor",
  medio_mayor: "Medio Mayor",
  prekinder: "Pre-Kinder",
  kinder: "Kinder",
};

export default function HomeScreen() {
  const { membership, organization, user, signOut } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [plans, setPlans] = useState<EconomicPlan[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  // Perfil y salones propios del profesional
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);

  useEffect(() => {
    if (membership?.role !== "admin" || !membership.organizationId) return;
    const unsubProfiles = listenProfiles(membership.organizationId, setProfiles);
    const unsubParticipants = listenParticipants(membership.organizationId, setParticipants);
    const unsubJornadas = listenJornadas(membership.organizationId, setJornadas);
    const unsubSalons = listenSalons(membership.organizationId, setSalons);
    const unsubPlans = listenPlans(membership.organizationId, setPlans);
    return () => {
      unsubProfiles();
      unsubParticipants();
      unsubJornadas();
      unsubSalons();
      unsubPlans();
    };
  }, [membership?.role, membership?.organizationId]);

  // Para profesional: cargar su perfil y los salones de la organización
  useEffect(() => {
    if (membership?.role !== "profesional" || !membership.organizationId || !user?.uid) return;
    const u1 = listenMyProfile(membership.organizationId, user.uid, setMyProfile);
    const u2 = listenSalons(membership.organizationId, setSalons);
    return () => { u1(); u2(); };
  }, [membership?.role, membership?.organizationId, user?.uid]);

  // Salones asignados al profesional (unión de ambas fuentes)
  const mySalons = useMemo<Salon[]>(() => {
    if (membership?.role !== "profesional" || !myProfile) return [];
    return salons.filter(
      (s) =>
        s.professionalIds.includes(myProfile.id) ||
        (myProfile.salonIds ?? []).includes(s.id)
    );
  }, [membership?.role, myProfile, salons]);

  const setupSteps = useMemo(
    () => [
      { key: "jornadas", label: "Jornadas", done: jornadas.length > 0, href: "/admin/jornadas" },
      { key: "salones", label: "Salones", done: salons.length > 0, href: "/admin/salones" },
      { key: "planes", label: "Planes económicos", done: plans.length > 0, href: "/admin/planes" },
      { key: "profesionales", label: "Profesionales", done: profiles.some((p) => p.role === "editor"), href: "/admin/profesionales" },
      { key: "participantes", label: "Participantes", done: participants.length > 0, href: "/admin/participantes" },
      { key: "calendario", label: "Calendario", done: true, href: "/calendario" },
    ],
    [profiles, participants, jornadas, salons, plans]
  );
  const completedSteps = setupSteps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedSteps / setupSteps.length) * 100);
  const stepIconByKey: Record<string, React.ComponentProps<typeof AppIcon>["name"]> = {
    jornadas: "clock-outline",
    salones: "door",
    planes: "cash-multiple",
    profesionales: "account-tie",
    participantes: "account-group",
    calendario: "calendar-month-outline",
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.warn("No se pudo cerrar sesión:", error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio" }]} />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Bitácora App</Text>
        <Text style={styles.title}>
          {membership?.name ? `Hola, ${membership.name.split(" ")[0]}.` : "Bienvenido de vuelta."}
        </Text>

        {membership?.role === "profesional" ? (
          <View style={styles.profesionalInfo}>
            <View style={styles.profesionalRow}>
              <AppIcon name="home-city-outline" size={15} color={colors.slate} />
              <Text style={styles.subtitle}>{organization?.name ?? "—"}</Text>
            </View>
            <View style={styles.profesionalRow}>
              <AppIcon name="door-open" size={15} color={colors.teal} />
              <Text style={styles.subtitle}>
                {mySalons.length > 0
                  ? `${mySalons.length} salón${mySalons.length > 1 ? "es" : ""} asignado${mySalons.length > 1 ? "s" : ""}`
                  : "Sin salones asignados"}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.subtitle}>
            {organization?.name ?? membership?.organizationId ?? "sin organización"} · {membership?.role ?? "sin rol"}
          </Text>
        )}

        <View style={styles.heroActions}>
          {/* Admin */}
          {membership?.role === "admin" && (
            <>
              <NavButton label="Panel Admin" icon="shield-crown-outline" onPress={() => router.push("/admin" as any)} primary />
              <NavButton label="Dashboard" icon="chart-box-outline" onPress={() => router.push("/admin/dashboard" as any)} />
            </>
          )}
          {/* Editor / Profesional */}
          {(membership?.role === "editor" || membership?.role === "profesional") && (
            <>
              <NavButton label="Participantes" icon="account-group-outline" onPress={() => router.push("/editor" as any)} primary />
              <NavButton label="Nueva Bitácora" icon="note-plus-outline" onPress={() => router.push("/editor" as any)} />
            </>
          )}
          {/* Lector / Apoderado */}
          {(membership?.role === "lector" || membership?.role === "lectura") && (
            <NavButton label="Participantes" icon="account-heart-outline" onPress={() => router.push("/apoderado" as any)} primary />
          )}
          {/* Shared */}
          <NavButton label="Calendario" icon="calendar-month-outline" onPress={() => router.push("/calendario" as any)} />
          <NavButton label="Chat" icon="chat-processing-outline" onPress={() => router.push("/chat" as any)} />
          <NavButton label={signingOut ? "Cerrando sesión..." : "Cerrar sesión"} icon="logout" onPress={handleSignOut} />
        </View>
      </View>

      {membership?.role === "profesional" && mySalons.length > 0 && (
        <View style={styles.salonCardsSection}>
          <Text style={styles.salonCardsSectionTitle}>Mis salones</Text>
          {mySalons.map((salon) => (
            <SalonCard key={salon.id} salon={salon} />
          ))}
        </View>
      )}

      {membership?.role === "admin" ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Creación de tu centro</Text>
            <Text style={styles.progressPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressNote}>
            {progressPercent >= 100
              ? "Tu centro está completamente configurado."
              : "Completa estos pasos para dejar tu centro listo para operar."}
          </Text>
          {setupSteps.map((step) => (
            <Pressable
              key={step.key}
              style={({ pressed }) => [styles.stepRow, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(step.href as any)}
            >
              <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                {step.done ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <AppIcon name={stepIconByKey[step.key] ?? "check-circle-outline"} size={12} color={colors.slate} />
                )}
              </View>
              <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
              <Text style={styles.stepArrow}>›</Text>
            </Pressable>
          ))}
          <Pressable style={styles.progressAction} onPress={() => router.push("/admin" as any)}>
            <Text style={styles.progressActionText}>Ir al panel admin</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.07)" } }),
  },
  kicker: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.teal },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: colors.ink, marginTop: spacing.xs },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: spacing.sm, lineHeight: 19 },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" },
  profesionalInfo: { marginTop: spacing.sm, gap: spacing.xs },
  profesionalRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  // Salon cards section
  salonCardsSection: { marginBottom: spacing.lg },
  salonCardsSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  salonCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
    ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.06)" } }),
  },
  salonCardAccent: { width: 5 },
  salonCardBody: { flex: 1, padding: spacing.md },
  salonCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  salonCardName: { fontSize: 16, fontWeight: "700" },
  salonCardLevel: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  salonCardStats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  salonCardStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  salonCardStatText: { fontSize: 12, color: colors.slate },
  inactiveBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  inactiveBadgeText: { fontSize: 11, fontWeight: "600", color: "#92400E" },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonText: { color: "#fff", fontWeight: "600" },
  secondaryButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: { color: colors.ink, fontWeight: "600" },
  progressCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...Platform.select({ web: { boxShadow: "0 1px 4px rgba(0,0,0,0.07)" } }),
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  progressPercent: { fontSize: 15, fontWeight: "700", color: colors.teal },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressFill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.teal },
  progressNote: { fontSize: 12, color: colors.slate, marginTop: spacing.sm, lineHeight: 18 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  stepArrow: { fontSize: 16, color: colors.slate, marginLeft: "auto" },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: { backgroundColor: colors.teal, borderColor: colors.teal },
  stepCheck: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stepLabel: { fontSize: 13, color: colors.slate },
  stepLabelDone: { color: colors.ink, fontWeight: "600" },
  progressAction: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  progressActionText: { color: colors.tealDark, fontWeight: "700", fontSize: 13 },
});

function SalonCard({ salon }: Readonly<{ salon: Salon }>) {
  const accent = salon.color ?? colors.teal;
  const bg = accent + "1A";
  const border = accent + "40";

  const levelLabel = salon.educationalLevel
    ? (EDUCATIONAL_LEVEL_LABELS[salon.educationalLevel] ?? salon.educationalLevel)
    : null;

  const participantCount = salon.participantIds?.length ?? 0;
  const capacity = salon.maxCapacity;

  const scheduleLabel = salon.jornadaName ?? (() => {
    if (!salon.schedule || salon.schedule.length === 0) return null;
    const entry = salon.schedule[0];
    return `${entry.startTime} – ${entry.endTime}`;
  })();

  return (
    <View style={[styles.salonCard, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.salonCardAccent, { backgroundColor: accent }]} />
      <View style={styles.salonCardBody}>
        <View style={styles.salonCardHeader}>
          <Text style={[styles.salonCardName, { color: accent }]}>{salon.name}</Text>
          {!salon.active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactivo</Text>
            </View>
          )}
        </View>

        {levelLabel ? (
          <Text style={styles.salonCardLevel}>{levelLabel}</Text>
        ) : null}

        <View style={styles.salonCardStats}>
          <View style={styles.salonCardStat}>
            <AppIcon name="account-group" size={13} color={accent} />
            <Text style={styles.salonCardStatText}>
              {participantCount}
              {capacity ? ` / ${capacity}` : ""} participante{participantCount !== 1 ? "s" : ""}
            </Text>
          </View>
          {scheduleLabel ? (
            <View style={styles.salonCardStat}>
              <AppIcon name="clock-outline" size={13} color={accent} />
              <Text style={styles.salonCardStatText}>{scheduleLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function NavButton({
  label,
  icon,
  onPress,
  primary,
}: Readonly<{
  label: string;
  icon: React.ComponentProps<typeof AppIcon>["name"];
  onPress: () => void;
  primary?: boolean;
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        primary
          ? { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg }
          : { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AppIcon name={icon} size={16} color={primary ? "#fff" : colors.slate} />
        <Text style={{ color: primary ? "#fff" : colors.ink, fontWeight: "600" }}>{label}</Text>
      </View>
    </Pressable>
  );
}
