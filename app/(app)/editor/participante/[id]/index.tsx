import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase";
import { useAuth } from "../../../../../src/context/AuthContext";
import { listenEntries } from "../../../../../src/data/entriesRepository";
import { listenMyProfile } from "../../../../../src/data/adminRepository";
import { EntryCard } from "../../../../../src/components/EntryCard";
import { colors, spacing } from "../../../../../src/theme";
import { Entry, Person, ProfileRecord } from "../../../../../src/types";
import Breadcrumb from "../../../../../src/components/Breadcrumb";

export default function EditorParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId || !id || !myProfile) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "organizations", membership.organizationId, "people", id)
      );
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Person;
        // Un profesional solo puede ver participantes de sus propios salones asignados.
        const mySalonIds = new Set(myProfile.salonIds ?? []);
        const belongsToMySalon = (data.salonIds ?? []).some((sid) => mySalonIds.has(sid));
        if (belongsToMySalon) setPerson(data);
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, id, myProfile]);

  useEffect(() => {
    if (!membership?.organizationId || !id || !person) return;
    return listenEntries(membership.organizationId, id, setEntries);
  }, [membership?.organizationId, id, person]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBlock}>
          <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes", href: "/editor" }]} />
        </View>
        <Text style={styles.empty}>No tienes acceso a este participante.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBlock}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes", href: "/editor" }, { label: person?.name ?? "Participante" }]} />
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          person ? (
            <View style={styles.header}>
              <View style={styles.headerRow}>
                {person.photoUrl ? (
                  <Image source={{ uri: person.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitials}>{getInitials(person.name)}</Text>
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <Text style={styles.participantName}>{person.name}</Text>
                  <Text style={styles.meta}>
                    {person.status} {person.planId ? `· plan ${person.planId}` : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.timelineLabel}>Registros</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Todavía no hay registros para este participante.</Text>
        }
        renderItem={({ item }) => <EntryCard entry={item} />}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/editor/participante/${id}/nuevo-registro` as any)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  header: { marginBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerInfo: { flex: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.line },
  avatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: colors.tealDark, fontSize: 16, fontWeight: "700" },
  participantName: { fontSize: 20, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  timelineLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.slate,
    marginTop: spacing.md,
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center" },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
