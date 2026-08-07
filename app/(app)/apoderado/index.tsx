import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { listenParticipants, listenPlans, listenSalons } from "../../../src/data/adminRepository";
import { colors, radius, shadow, spacing } from "../../../src/theme";
import { EconomicPlan, Person, Salon } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import AppIcon from "../../../src/components/AppIcon";

export default function ApoderadoPanelScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [participants, setParticipants] = useState<Person[]>([]);
  const [plans, setPlans] = useState<EconomicPlan[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    const unsub = listenParticipants(membership.organizationId, (items) => {
      setParticipants(items.filter((p) => p.linkedUid && p.linkedUid === membership.uid));
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenPlans(membership.organizationId, setPlans);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerPad}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Participantes" }]} />
        <Text style={styles.pageTitle}>Participantes</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : null}
      {!loading && participants.length === 0 ? (
        <View style={styles.emptyWrap}>
          <AppIcon name="account-off-outline" size={48} color={colors.tealTint} />
          <Text style={styles.empty}>No hay participantes asignados aún.</Text>
        </View>
      ) : null}
      {!loading && participants.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {participants.map((item) => {
            const plan = plans.find((p) => p.id === item.planId);
            const salonList = (item.salonIds ?? []).map(
              (sid) => salons.find((s) => s.id === sid)?.name ?? sid
            );
            const initials = item.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("");

            return (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/apoderado/participante/${item.id}` as any)}
              >
                {/* Cabecera */}
                <View style={styles.cardHeader}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={styles.headerInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    {plan ? (
                      <View style={styles.planBadge}>
                        <AppIcon name="cash-multiple" size={11} color={colors.amber} />
                        <Text style={styles.planBadgeText}>{plan.name}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.statusDot, item.status === "activo" ? styles.dotActive : styles.dotInactive]} />
                  <AppIcon name="chevron-right" size={18} color={colors.slate} />
                </View>

                {/* Info detalle */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <AppIcon name="door" size={14} color={colors.slate} />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {salonList.length ? salonList.join(", ") : "Sin salones asignados"}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <AppIcon name="account-check-outline" size={14} color={colors.slate} />
                    <Text style={styles.infoText}>
                      {item.status === "activo" ? "Activo" : "Inactivo"}
                    </Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.readOnlyBadge}>
                    <AppIcon name="eye-outline" size={12} color={colors.amber} />
                    <Text style={styles.readOnlyText}>Solo lectura</Text>
                  </View>
                  <Text style={styles.viewLink}>Ver bitácora →</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pageTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center" },
  card: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#fff" },
  avatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 16, fontWeight: "700", color: colors.tealDark },
  headerInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    alignSelf: "flex-start",
    backgroundColor: colors.amberTint,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  planBadgeText: { fontSize: 11, fontWeight: "600", color: colors.amber },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: "#22C55E" },
  dotInactive: { backgroundColor: colors.slate },
  infoGrid: { marginTop: spacing.sm, gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: colors.slate, flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.amberTint,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  readOnlyText: { fontSize: 11, fontWeight: "600", color: colors.amber },
  viewLink: { fontSize: 12, fontWeight: "700", color: colors.teal },
});

