import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../src/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { listenCalendarEvents, eventOccursOnDate } from "../../../src/data/calendarRepository";
import { AttendanceSummary, getAttendanceSummaries } from "../../../src/data/attendanceRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { CalendarEvent } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";

interface Stats {
  participants: number;
  salons: number;
  profiles: number;
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function AdminDashboardScreen() {
  const { membership } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceSummary | null>(null);
  const [showHolidayAudit, setShowHolidayAudit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    (async () => {
      const [pSnap, sSnap, prSnap] = await Promise.all([
        getDocs(collection(db, "organizations", membership.organizationId, "people")),
        getDocs(collection(db, "organizations", membership.organizationId, "salons")),
        getDocs(collection(db, "organizations", membership.organizationId, "profiles")),
      ]);
      const participantIds = pSnap.docs.map((d) => d.id);
      const perParticipant = await getAttendanceSummaries(membership.organizationId, participantIds);

      const values = Object.values(perParticipant);
      const expectedMonth = values.reduce((acc, item) => acc + item.expectedMonth, 0);
      const expectedYear = values.reduce((acc, item) => acc + item.expectedYear, 0);
      const presentMonth = values.reduce((acc, item) => acc + item.presentMonth, 0);
      const presentYear = values.reduce((acc, item) => acc + item.presentYear, 0);
      const monthPercent = expectedMonth > 0 ? Math.round((presentMonth / expectedMonth) * 100) : 0;
      const yearPercent = expectedYear > 0 ? Math.round((presentYear / expectedYear) * 100) : 0;

      setStats({
        participants: pSnap.size,
        salons: sSnap.size,
        profiles: prSnap.size,
      });
      setAttendanceStats({
        monthPercent,
        yearPercent,
        presentMonth,
        presentYear,
        expectedMonth,
        expectedYear,
        holidayMonthCount: values[0]?.holidayMonthCount ?? 0,
        holidayYearCount: values[0]?.holidayYearCount ?? 0,
        holidayMonthDates: values[0]?.holidayMonthDates ?? [],
        holidayYearDates: values[0]?.holidayYearDates ?? [],
      });
      setLoading(false);
    })();

    return listenCalendarEvents(membership.organizationId, (events) =>
      setTodayEvents(events.filter((e) => eventOccursOnDate(e, TODAY)))
    );
  }, [membership?.organizationId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Dashboard" }]} />

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          <Text style={styles.sectionLabel}>Resumen</Text>
          <View style={styles.statsRow}>
            <StatCard label="Participantes" value={stats?.participants ?? 0} />
            <StatCard label="Salones" value={stats?.salons ?? 0} />
            <StatCard label="Profesionales" value={stats?.profiles ?? 0} />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Asistencia</Text>
          <Pressable style={styles.auditToggle} onPress={() => setShowHolidayAudit((prev) => !prev)}>
            <Text style={styles.auditToggleText}>{showHolidayAudit ? "Ocultar detalle de feriados" : "Ver detalle de feriados"}</Text>
          </Pressable>
          <View style={styles.statsRow}>
            <PercentCard
              label="Mes actual"
              percent={attendanceStats?.monthPercent ?? 0}
              detail={`${attendanceStats?.presentMonth ?? 0}/${attendanceStats?.expectedMonth ?? 0} días hábiles · feriados: ${attendanceStats?.holidayMonthCount ?? 0}`}
            />
            <PercentCard
              label="Año actual"
              percent={attendanceStats?.yearPercent ?? 0}
              detail={`${attendanceStats?.presentYear ?? 0}/${attendanceStats?.expectedYear ?? 0} días hábiles · feriados: ${attendanceStats?.holidayYearCount ?? 0}`}
            />
          </View>
          {showHolidayAudit ? (
            <View style={styles.holidayAuditCard}>
              <Text style={styles.holidayAuditTitle}>Auditoría de feriados descontados</Text>
              <Text style={styles.holidayAuditText}>
                Mes: {attendanceStats?.holidayMonthDates.join(", ") || "sin feriados hábiles en el período"}
              </Text>
              <Text style={styles.holidayAuditText}>
                Año: {attendanceStats?.holidayYearDates.slice(0, 14).join(", ") || "sin feriados hábiles en el período"}
                {(attendanceStats?.holidayYearDates.length ?? 0) > 14 ? ", ..." : ""}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
            Agenda de hoy · {TODAY}
          </Text>
          {todayEvents.length === 0 ? (
            <Text style={styles.empty}>Sin eventos hoy.</Text>
          ) : (
            todayEvents.map((e) => (
              <View key={e.id} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{e.title}</Text>
                {e.startTime ? (
                  <Text style={styles.eventMeta}>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ""}</Text>
                ) : null}
                {e.description ? <Text style={styles.eventMeta}>{e.description}</Text> : null}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PercentCard({ label, percent, detail }: { label: string; percent: number; detail: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{percent}%</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.percentDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.4 },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  auditToggle: { alignSelf: "flex-start", marginBottom: spacing.sm },
  auditToggleText: { color: colors.teal, fontSize: 12, fontWeight: "700" },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "700", color: colors.teal },
  statLabel: { fontSize: 12, color: colors.slate, marginTop: 4 },
  percentDetail: { fontSize: 11, color: colors.slate, marginTop: 4, textAlign: "center" },
  holidayAuditCard: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  holidayAuditTitle: { fontSize: 12, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  holidayAuditText: { fontSize: 11, color: colors.slate, marginTop: 3 },
  eventCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  eventMeta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  empty: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.sm },
});
