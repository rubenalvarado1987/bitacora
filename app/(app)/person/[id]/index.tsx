import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, collection, onSnapshot, orderBy, query, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { Entry, Person, Salon } from "../../../../src/types";
import { TimelineEntryCard } from "../../../../src/components/TimelineEntryCard";
import ProfileSidebar from "../../../../src/components/ProfileSidebar";
import { colors, radius, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import { groupEntriesByDay } from "../../../../src/utils/entries";
import { listenSalons } from "../../../../src/data/adminRepository";

type TimelineListItem =
  | { kind: "header"; key: string; label: string }
  | { kind: "entry"; key: string; entry: Entry; isLast: boolean };

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();

  const [person, setPerson] = useState<Person | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const canEdit = membership?.role === "admin" || membership?.role === "editor" || membership?.role === "profesional";

  useEffect(() => {
    if (!membership?.organizationId || !id) return;

    (async () => {
      const personSnap = await getDoc(doc(db, "organizations", membership.organizationId, "people", id));
      if (personSnap.exists()) {
        const personData = { id: personSnap.id, ...personSnap.data() } as Person;
        setPerson(personData);
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, id]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;

    const q = query(
      collection(db, "organizations", membership.organizationId, "people", id, "entries"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Entry)));
    });

    return unsubscribe;
  }, [membership?.organizationId, id]);

  const timelineItems = useMemo<TimelineListItem[]>(() => {
    const groups = groupEntriesByDay(entries);
    let entryIndex = 0;
    const totalEntries = entries.length;
    return groups.flatMap((group) => {
      const header: TimelineListItem = { kind: "header", key: `header-${group.dateKey}`, label: group.label };
      const entryItems = group.items.map((entry) => {
        entryIndex += 1;
        return {
          kind: "entry",
          key: entry.id,
          entry,
          isLast: entryIndex === totalEntries,
        } as TimelineListItem;
      });
      return [header, ...entryItems];
    });
  }, [entries]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No se encontró esta ficha.</Text>
      </View>
    );
  }

  const assignedSalonNames = (person.salonIds ?? [])
    .map((salonId) => salons.find((s) => s.id === salonId)?.name)
    .filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: person.name }]} />

      <FlatList
        data={timelineItems}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <ProfileSidebar person={person} assignedSalonNames={assignedSalonNames} showExtendedKeyInfo />
            <Text style={styles.timelineLabel}>Registros</Text>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === "header" ? (
            <Text style={styles.dayHeader}>{item.label}</Text>
          ) : (
            <TimelineEntryCard entry={item.entry} isLast={item.isLast} />
          )
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Todavía no hay registros para esta persona.</Text>
        }
      />

      {canEdit ? (
        <Pressable style={styles.fab} onPress={() => router.push(`/person/${id}/nuevo-registro`)}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  timelineLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.slate,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textTransform: "capitalize",
  },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
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
