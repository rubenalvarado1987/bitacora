import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { listenEntries } from "../../../../src/data/entriesRepository";
import { EntryCard } from "../../../../src/components/EntryCard";
import { colors, spacing } from "../../../../src/theme";
import { Entry, Person } from "../../../../src/types";
import Breadcrumb from "../../../../src/components/Breadcrumb";

export default function ApoderadoParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "organizations", membership.organizationId, "people", id)
      );
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Person;
        // Un apoderado solo puede ver la ficha de su propio hijo/a vinculado.
        if (data.linkedUid && data.linkedUid === membership.uid) {
          setPerson(data);
        }
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, membership?.uid, id]);

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
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes", href: "/apoderado" }]} />
        <Text style={styles.empty}>No tienes acceso a este participante.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes", href: "/apoderado" }, { label: person?.name ?? "Participante" }]} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          person ? (
            <View style={styles.header}>
              <Text style={styles.name}>{person.name}</Text>
              <Text style={styles.meta}>{person.status}</Text>
              <Text style={styles.timelineLabel}>Registros</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No hay registros disponibles aún.</Text>
        }
        renderItem={({ item }) => <EntryCard entry={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  timelineLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.slate,
    marginTop: spacing.md,
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center" },
});
