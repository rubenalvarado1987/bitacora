import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { listenMyProfile, listenParticipants, listenPlans, listenSalons } from "../../../src/data/adminRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { EconomicPlan, Person, ProfileRecord, Salon } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";

export default function EditorPanelScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [allParticipants, setAllParticipants] = useState<Person[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [plans, setPlans] = useState<EconomicPlan[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenParticipants(membership.organizationId, (items) => {
      setAllParticipants(items);
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenPlans(membership.organizationId, setPlans);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  // Un profesional solo ve a los participantes de los salones que tiene asignados.
  const participants = useMemo(() => {
    const mySalonIds = new Set(myProfile?.salonIds ?? []);
    if (mySalonIds.size === 0) return [];
    return allParticipants.filter((p) => (p.salonIds ?? []).some((id) => mySalonIds.has(id)));
  }, [allParticipants, myProfile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBlock}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes" }]} />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay participantes registrados aún.</Text>
          }
          renderItem={({ item }) => {
            const planName = item.planId ? plans.find((p) => p.id === item.planId)?.name ?? item.planId : null;
            const salonNames = (item.salonIds ?? []).map((id) => salons.find((s) => s.id === id)?.name ?? id);
            const comuna = getComunaFromBaseData(item);

            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/editor/participante/${item.id}` as any)}
              >
                <View style={styles.cardHeaderRow}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
                    </View>
                  )}
                  <View style={styles.cardInfoCol}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>{item.status}{planName ? ` · plan ${planName}` : ""}</Text>
                    {comuna ? <Text style={styles.meta}>Comuna: {comuna}</Text> : null}
                    <Text style={styles.meta}>
                      Salones: {salonNames.length ? salonNames.join(", ") : "ninguno"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getComunaFromBaseData(person: Person): string | null {
  const value = person.baseData?.comuna;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  topBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardInfoCol: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.line },
  avatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: colors.tealDark, fontSize: 12, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
});
