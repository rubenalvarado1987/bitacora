import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { listenParticipants, listenPlans, listenProfiles, listenSalons } from "../../src/data/adminRepository";
import { EconomicPlan, Person, ProfileRecord, Salon } from "../../src/types";
import { colors, radius, spacing } from "../../src/theme";

export default function HomeScreen() {
  const { membership, signOut } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [plans, setPlans] = useState<EconomicPlan[]>([]);

  useEffect(() => {
    if (membership?.role !== "admin" || !membership.organizationId) return;
    const unsubProfiles = listenProfiles(membership.organizationId, setProfiles);
    const unsubParticipants = listenParticipants(membership.organizationId, setParticipants);
    const unsubSalons = listenSalons(membership.organizationId, setSalons);
    const unsubPlans = listenPlans(membership.organizationId, setPlans);
    return () => {
      unsubProfiles();
      unsubParticipants();
      unsubSalons();
      unsubPlans();
    };
  }, [membership?.role, membership?.organizationId]);

  const setupSteps = useMemo(
    () => [
      { key: "perfiles", label: "Perfiles creados", done: profiles.length > 0 },
      { key: "profesionales", label: "Profesionales asignados", done: profiles.some((p) => p.role === "editor") },
      { key: "participantes", label: "Participantes registrados", done: participants.length > 0 },
      { key: "salones", label: "Salones creados", done: salons.length > 0 },
      { key: "planes", label: "Planes económicos creados", done: plans.length > 0 },
    ],
    [profiles, participants, salons, plans]
  );
  const completedSteps = setupSteps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedSteps / setupSteps.length) * 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Bitácora App</Text>
        <Text style={styles.title}>Bienvenido de vuelta.</Text>
        <Text style={styles.subtitle}>
          Organización: {membership?.organizationId ?? "sin organización"} · Rol: {membership?.role ?? "sin rol"}
        </Text>

        <View style={styles.heroActions}>
          {/* Admin */}
          {membership?.role === "admin" && (
            <>
              <NavButton label="Panel Admin" onPress={() => router.push("/admin" as any)} primary />
              <NavButton label="Dashboard" onPress={() => router.push("/admin/dashboard" as any)} />
            </>
          )}
          {/* Editor / Profesional */}
          {(membership?.role === "editor" || membership?.role === "profesional") && (
            <NavButton label="Mis participantes" onPress={() => router.push("/editor" as any)} primary />
          )}
          {/* Lector / Apoderado */}
          {(membership?.role === "lector" || membership?.role === "lectura") && (
            <NavButton label="Mis participantes" onPress={() => router.push("/apoderado" as any)} primary />
          )}
          {/* Shared */}
          <NavButton label="Calendario" onPress={() => router.push("/calendario" as any)} />
          <NavButton label="Chat" onPress={() => router.push("/chat" as any)} />
          <NavButton label="Cerrar sesión" onPress={signOut} />
        </View>
      </View>

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
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                {step.done ? <Text style={styles.stepCheck}>✓</Text> : null}
              </View>
              <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
            </View>
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
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  kicker: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.teal },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: colors.ink, marginTop: spacing.xs },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: spacing.sm, lineHeight: 19 },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg, flexWrap: "wrap" },
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

function NavButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
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
      <Text style={{ color: primary ? "#fff" : colors.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
