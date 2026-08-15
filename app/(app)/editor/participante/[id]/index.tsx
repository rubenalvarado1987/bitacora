import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase";
import { useAuth } from "../../../../../src/context/AuthContext";
import { listenEntries } from "../../../../../src/data/entriesRepository";
import { listenMyProfile, listenSalons } from "../../../../../src/data/adminRepository";
import { AttendanceSummary, getAttendanceSummaries } from "../../../../../src/data/attendanceRepository";
import { colors, spacing } from "../../../../../src/theme";
import { Entry, Person, ProfileRecord, Salon } from "../../../../../src/types";
import Breadcrumb from "../../../../../src/components/Breadcrumb";
import ProfileSidebar from "../../../../../src/components/ProfileSidebar";
import DailySummaryCard from "../../../../../src/components/DailySummaryCard";
import { TimelineEntryCard } from "../../../../../src/components/TimelineEntryCard";
import AppIcon from "../../../../../src/components/AppIcon";

export default function EditorParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showHolidayAudit, setShowHolidayAudit] = useState(false);
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
        <View style={styles.header}>
          <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Participantes", href: "/editor" }]} />
        </View>
        <Text style={styles.empty}>No tienes acceso a este participante.</Text>
      </View>
    );
  }

  const timelineContent = (
    <>
      <View style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <View style={styles.attendanceTitleRow}>
            <AppIcon name="calendar-check-outline" size={16} color={colors.tealDark} />
            <Text style={styles.attendanceTitle}>Asistencia</Text>
          </View>
          <Pressable onPress={() => setShowHolidayAudit((prev) => !prev)} hitSlop={8}>
            <AppIcon name="information-outline" size={16} color={colors.slate} />
          </Pressable>
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
        {showHolidayAudit ? (
          <View style={styles.holidayAuditBox}>
            <Text style={styles.holidayAuditTitle}>Feriados descontados</Text>
            <Text style={styles.holidayAuditLine}>
              {loadingAttendance || !attendance
                ? "Mes: --"
                : `Mes: ${attendance.holidayMonthCount} (${attendance.holidayMonthDates.join(", ") || "sin feriados"})`}
            </Text>
            <Text style={styles.holidayAuditLine}>
              {loadingAttendance || !attendance
                ? "Año: --"
                : `Año: ${attendance.holidayYearCount} (${attendance.holidayYearDates.slice(0, 8).join(", ") || "sin feriados"}${attendance && attendance.holidayYearDates.length > 8 ? ", ..." : ""})`}
            </Text>
          </View>
        ) : null}
      </View>
      <DailySummaryCard entries={entries} personName={person.name} />
      <Text style={styles.timelineHeader}>REGISTROS</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay registros para este participante.</Text>
      ) : (
        entries.map((entry, index) => (
          <TimelineEntryCard
            key={entry.id}
            entry={entry}
            isLast={index === entries.length - 1}
          />
        ))
      )}
    </>
  );

  const assignedSalonNames = (person.salonIds ?? [])
    .map((salonId) => salons.find((s) => s.id === salonId)?.name)
    .filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Participantes", href: "/editor" },
            { label: person.name },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.singleColContent}>
        <ProfileSidebar person={person} assignedSalonNames={assignedSalonNames} />
        <View style={styles.timelineWrap}>{timelineContent}</View>
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push(`/editor/participante/${id}/nuevo-registro` as any)}
      >
        <AppIcon name="plus" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
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
  attendanceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  attendanceTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  attendanceTitle: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  attendanceLine: { fontSize: 12, color: colors.slate, marginTop: 2 },
  holidayAuditBox: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 4,
  },
  holidayAuditTitle: { fontSize: 12, fontWeight: "700", color: colors.ink },
  holidayAuditLine: { fontSize: 11, color: colors.slate },
  timelineHeader: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.slate,
    textTransform: "uppercase",
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.lg },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg + 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

