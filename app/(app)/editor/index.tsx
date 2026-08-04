import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { listenMyProfile, listenParticipants } from "../../../src/data/adminRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { Person, ProfileRecord } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";

export default function EditorPanelScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [allParticipants, setAllParticipants] = useState<Person[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
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

  // Un profesional solo ve a los participantes de los salones que tiene asignados.
  const participants = useMemo(() => {
    const mySalonIds = new Set(myProfile?.salonIds ?? []);
    if (mySalonIds.size === 0) return [];
    return allParticipants.filter((p) => (p.salonIds ?? []).some((id) => mySalonIds.has(id)));
  }, [allParticipants, myProfile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes" }]} />
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
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/editor/participante/${item.id}` as any)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.status} {item.planId ? `· plan ${item.planId}` : ""}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
});
