import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, collection, onSnapshot, orderBy, query, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { Entry, Person, Template } from "../../../../src/types";
import { EntryCard } from "../../../../src/components/EntryCard";
import { FieldDisplay } from "../../../../src/components/SectionField";
import { colors, radius, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();

  const [person, setPerson] = useState<Person | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;

    (async () => {
      const personSnap = await getDoc(doc(db, "organizations", membership.organizationId, "people", id));
      if (personSnap.exists()) {
        const personData = { id: personSnap.id, ...personSnap.data() } as Person;
        setPerson(personData);

        const templateSnap = await getDoc(doc(db, "templates", personData.templateId));
        if (templateSnap.exists()) {
          setTemplate({ id: templateSnap.id, ...templateSnap.data() } as Template);
        }
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, id]);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: person.name }]} />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            {template?.baseSections.map((section) => (
              <View key={section.id} style={styles.baseCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.fields.map((field) => (
                  <FieldDisplay key={field.id} label={field.label} value={person.baseData?.[field.id]} />
                ))}
              </View>
            ))}
            <Text style={styles.timelineLabel}>Registros</Text>
          </View>
        }
        renderItem={({ item }) => <EntryCard entry={item} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Todavía no hay registros para esta persona.</Text>
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push(`/person/${id}/nuevo-registro`)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  baseCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.slate,
    marginBottom: spacing.xs,
  },
  timelineLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.slate,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
