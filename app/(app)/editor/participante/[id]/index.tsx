import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase";
import { useAuth } from "../../../../../src/context/AuthContext";
import { listenEntries } from "../../../../../src/data/entriesRepository";
import { EntryCard } from "../../../../../src/components/EntryCard";
import { colors, radius, spacing } from "../../../../../src/theme";
import { Entry, Person } from "../../../../../src/types";

export default function EditorParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "organizations", membership.organizationId, "people", id)
      );
      if (snap.exists()) setPerson({ id: snap.id, ...snap.data() } as Person);
      setLoading(false);
    })();
  }, [membership?.organizationId, id]);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;
    return listenEntries(membership.organizationId, id, setEntries);
  }, [membership?.organizationId, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: person?.name ?? "Participante" }} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          person ? (
            <View style={styles.header}>
              <Text style={styles.participantName}>{person.name}</Text>
              <Text style={styles.meta}>
                {person.status} {person.planId ? `· plan ${person.planId}` : ""}
              </Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
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
