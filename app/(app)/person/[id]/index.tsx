import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
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
import { AttendanceSummary, getAttendanceSummaries } from "../../../../src/data/attendanceRepository";

function useGridColumns() {
  const { width } = useWindowDimensions();
  if (width >= 860) return 4;
  if (width >= 600) return 3;
  if (width >= 400) return 2;
  return 1;
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();

  const numColumns = useGridColumns();
  const [person, setPerson] = useState<Person | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
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
    let alive = true;
    getAttendanceSummaries(membership.organizationId, [id])
      .then((data) => { if (alive) setAttendance(data[id] ?? null); })
      .catch(() => { if (alive) setAttendance(null); });
    return () => { alive = false; };
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

  /** Últimas 3 imágenes (sin PDFs) cargadas en entradas de ACTIVIDADES */
  const recentActivityPhotos = useMemo<string[]>(() => {
    const photos: string[] = [];
    for (const entry of entries) {
      if (!entry.type.toLowerCase().includes("actividad")) continue;
      for (const val of Object.values(entry.values ?? {})) {
        if (typeof val !== "string" || !val.startsWith("[")) continue;
        try {
          const urls: string[] = JSON.parse(val);
          for (const url of urls) {
            if (typeof url === "string" && url.startsWith("http") && !url.toLowerCase().includes(".pdf")) {
              photos.push(url);
              if (photos.length >= 3) return photos;
            }
          }
        } catch { /* ignore */ }
      }
    }
    return photos;
  }, [entries]);

  const dayGroups = useMemo(() => groupEntriesByDay(entries), [entries]);

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={{ marginBottom: spacing.lg }}>
          <ProfileSidebar
            person={person}
            assignedSalonNames={assignedSalonNames}
            showExtendedKeyInfo
            recentPhotos={recentActivityPhotos}
            attendanceMonthPercent={attendance?.monthPercent ?? null}
            attendanceYearPercent={attendance?.yearPercent ?? null}
          />
          <Text style={styles.timelineLabel}>Registros</Text>
        </View>

        {dayGroups.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay registros para esta persona.</Text>
        ) : (
          dayGroups.map((group) => (
            <View key={group.dateKey} style={styles.dayGroup}>
              <Text style={styles.dayHeader}>{group.label}</Text>
              <View style={styles.entriesGrid}>
                {group.items.map((entry) => (
                  <View
                    key={entry.id}
                    style={[styles.entryGridItem, { width: `${100 / numColumns}%` as any }]}
                  >
                    <TimelineEntryCard entry={entry} isLast={false} gridMode={numColumns > 1} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl + 80 },
  dayGroup: { marginBottom: spacing.lg },
  entriesGrid: { flexDirection: "row", flexWrap: "wrap" },
  entryGridItem: { padding: spacing.xs },
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
