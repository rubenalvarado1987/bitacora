import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { listenEntries } from "../../../../src/data/entriesRepository";
import { listenSalons } from "../../../../src/data/adminRepository";
import { AttendanceSummary, getAttendanceSummaries } from "../../../../src/data/attendanceRepository";
import { colors, spacing } from "../../../../src/theme";
import { Entry, Person, Salon } from "../../../../src/types";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import ProfileSidebar from "../../../../src/components/ProfileSidebar";
import DailySummaryCard from "../../../../src/components/DailySummaryCard";
import { TimelineEntryCard } from "../../../../src/components/TimelineEntryCard";
import AppIcon from "../../../../src/components/AppIcon";
import { groupEntriesByDay } from "../../../../src/utils/entries";

export default function ApoderadoParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId || !id) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "organizations", membership.organizationId, "people", id)
      );
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Person;
        if (data.linkedUid && data.linkedUid === membership.uid) setPerson(data);
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, membership?.uid, id]);

  useEffect(() => {
    if (!membership?.organizationId || !id || !person) return;
    return listenEntries(membership.organizationId, id, setEntries);
  }, [membership?.organizationId, id, person]);

  useEffect(() => {
    if (!membership?.organizationId || !id || !person) return;
    let alive = true;
    setLoadingAttendance(true);
    getAttendanceSummaries(membership.organizationId, [id])
      .then((data) => {
        if (!alive) return;
        setAttendance(data[id] ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setAttendance(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingAttendance(false);
      });

    return () => {
      alive = false;
    };
  }, [membership?.organizationId, id, person]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Participantes", href: "/apoderado" }]} />
        <Text style={styles.empty}>No tienes acceso a este participante.</Text>
      </View>
    );
  }

  const timelineContent = (
    <>
      <View style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <AppIcon name="calendar-check-outline" size={16} color={colors.tealDark} />
          <Text style={styles.attendanceTitle}>Asistencia</Text>
        </View>
        <Text style={styles.attendanceLine}>
          {loadingAttendance || !attendance
            ? "Mes actual: --%"
            : `Mes actual: ${attendance.monthPercent}% (${attendance.presentMonth}/${attendance.expectedMonth} días hábiles)`}
        </Text>
        <Text style={styles.attendanceLine}>
          {loadingAttendance || !attendance
            ? "Año actual: --%"
            : `Año actual: ${attendance.yearPercent}% (${attendance.presentYear}/${attendance.expectedYear} días hábiles)`}
        </Text>
      </View>
      <DailySummaryCard entries={entries} personName={person.name} />
      <Text style={styles.timelineHeader}>REGISTROS</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No hay registros disponibles aún.</Text>
      ) : (
        (() => {
          const groups = groupEntriesByDay(entries);
          return groups.map((group, groupIndex) => {
            const entriesBefore = groups.slice(0, groupIndex).reduce((acc, g) => acc + g.items.length, 0);
            return (
              <View key={group.dateKey} style={styles.dayGroup}>
                <Text style={styles.dayHeader}>{group.label}</Text>
                {group.items.map((entry, index) => {
                  const globalIndex = entriesBefore + index;
                  return (
                    <TimelineEntryCard
                      key={entry.id}
                      entry={entry}
                      isLast={globalIndex === entries.length - 1}
                    />
                  );
                })}
              </View>
            );
          });
        })()
      )}
    </>
  );

  const assignedSalonNames = (person.salonIds ?? [])
    .map((salonId) => salons.find((s) => s.id === salonId)?.name)
    .filter(Boolean) as string[];

  const emotionalEntries = entries
    .filter((e) => e.type === "Emocional")
    .slice(0, 7);
  const emotionalTrend = emotionalEntries
    .map((e) => normalizeEmotionScore(e.values?.estado_animo))
    .filter((score): score is number => score !== null)
    .reverse();
  const latestEmotionalState = emotionalEntries[0]?.values?.estado_animo;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Participantes", href: "/apoderado" },
            { label: person.name },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.singleColContent}>
          <ProfileSidebar
            person={person}
            assignedSalonNames={assignedSalonNames}
            attendanceMonthPercent={attendance?.monthPercent ?? null}
            attendanceYearPercent={attendance?.yearPercent ?? null}
            emotionalStateLabel={typeof latestEmotionalState === "string" ? latestEmotionalState : null}
            emotionalTrend={emotionalTrend}
          />
          <View style={styles.timelineWrap}>{timelineContent}</View>
        </ScrollView>
    </View>
  );
}

function normalizeEmotionScore(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("feliz") || text.includes("content") || text.includes("tranquil") || text.includes("calm")) return 85;
  if (text.includes("bien") || text.includes("estable")) return 70;
  if (text.includes("neutral") || text.includes("normal")) return 55;
  if (text.includes("triste") || text.includes("ansio") || text.includes("llanto") || text.includes("irrit")) return 35;
  return 60;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  // --- Header ---
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  // --- Layouts ---
  twoCol: {},
  sidebarCol: {},
  mainCol: {},
  mainColContent: {},
  singleColContent: { padding: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
  timelineWrap: {},
  attendanceCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  attendanceHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  attendanceTitle: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  attendanceLine: { fontSize: 12, color: colors.slate, marginTop: 2 },
  // --- Timeline section header ---
  timelineHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.slate,
    textTransform: "uppercase",
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  dayGroup: { marginBottom: spacing.sm },
  dayHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.sm,
    textTransform: "capitalize",
  },
  empty: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
});

