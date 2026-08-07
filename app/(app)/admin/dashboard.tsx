import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../src/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { listenCalendarEvents, eventOccursOnDate } from "../../../src/data/calendarRepository";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    (async () => {
      const [pSnap, sSnap, prSnap] = await Promise.all([
        getDocs(collection(db, "organizations", membership.organizationId, "people")),
        getDocs(collection(db, "organizations", membership.organizationId, "salons")),
        getDocs(collection(db, "organizations", membership.organizationId, "profiles")),
      ]);
      setStats({
        participants: pSnap.size,
        salons: sSnap.size,
        profiles: prSnap.size,
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 0.4 },
  statsRow: { flexDirection: "row", gap: spacing.sm },
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
