import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { listenMyProfile, listenParticipants, listenPlans, listenSalons } from "../../../src/data/adminRepository";
import { AttendanceSummary, getAttendanceSummaries } from "../../../src/data/attendanceRepository";
import { colors, radius, shadow, spacing } from "../../../src/theme";
import { EconomicPlan, Person, ProfileRecord, Salon } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import AppIcon from "../../../src/components/AppIcon";

export default function EditorPanelScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [allParticipants, setAllParticipants] = useState<Person[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [plans, setPlans] = useState<EconomicPlan[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [attendanceByParticipant, setAttendanceByParticipant] = useState<Record<string, AttendanceSummary>>({});
  const [loading, setLoading] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenParticipants(membership.organizationId, (items) => {
      setAllParticipants(items);
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenPlans(membership.organizationId, setPlans);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  // Un profesional solo ve a los participantes de los salones que tiene asignados.
  const mySalonIds = useMemo(() => new Set(myProfile?.salonIds ?? []), [myProfile]);

  const participants = useMemo(() => {
    if (mySalonIds.size === 0) return [];
    return allParticipants.filter((p) => (p.salonIds ?? []).some((id) => mySalonIds.has(id)));
  }, [allParticipants, mySalonIds]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const ids = participants.map((p) => p.id);
    if (ids.length === 0) {
      setAttendanceByParticipant({});
      return;
    }

    let alive = true;
    setLoadingAttendance(true);
    getAttendanceSummaries(membership.organizationId, ids)
      .then((summary) => {
        if (alive) setAttendanceByParticipant(summary);
      })
      .catch(() => {
        if (alive) setAttendanceByParticipant({});
      })
      .finally(() => {
        if (alive) setLoadingAttendance(false);
      });

    return () => {
      alive = false;
    };
  }, [membership?.organizationId, participants]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter((p) => p.name.toLowerCase().includes(term));
  }, [participants, search]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerPad}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes" }]} />

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Mis participantes</Text>
          {myProfile ? (
            <View style={styles.profilePill}>
              <AppIcon name="account-tie" size={14} color={colors.tealDark} />
              <Text style={styles.profilePillText}>{myProfile.displayName}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="magnify" size={18} color={colors.slate} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre…"
            style={styles.searchInput}
            placeholderTextColor={colors.slate}
          />
          {search.trim() ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <AppIcon name="close-circle" size={18} color={colors.slate} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <AppIcon name="account-search" size={40} color={colors.tealTint} />
              <Text style={styles.empty}>{getEmptyMessage(search, mySalonIds.size)}</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const plan = item.planId ? plans.find((p) => p.id === item.planId) : null;
              const salonList = (item.salonIds ?? []).map(
                (sid) => salons.find((s) => s.id === sid)?.name ?? sid
              );
              const comuna = getComunaFromBaseData(item);
              const telefono = getTelefonoFromBaseData(item);
              const attendance = attendanceByParticipant[item.id];

              return (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => router.push(`/editor/participante/${item.id}` as any)}
                >
                  {/* Cabecera: avatar + nombre + estado */}
                  <View style={styles.cardHeaderRow}>
                    {item.photoUrl ? (
                      <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
                      </View>
                    )}
                    <View style={styles.cardInfoCol}>
                      <Text style={styles.name}>{item.name}</Text>
                      {plan ? (
                        <View style={styles.planBadge}>
                          <AppIcon name="cash-multiple" size={11} color={colors.amber} />
                          <Text style={styles.planBadgeText}>{plan.name}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.statusDot, item.status === "activo" ? styles.statusDotActive : styles.statusDotInactive]} />
                    <AppIcon name="chevron-right" size={18} color={colors.slate} />
                  </View>

                  {/* Grilla de info */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <AppIcon name="door" size={14} color={colors.slate} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {salonList.length ? salonList.join(", ") : "Sin salones"}
                      </Text>
                    </View>
                    {comuna ? (
                      <View style={styles.infoRow}>
                        <AppIcon name="map-marker-outline" size={14} color={colors.slate} />
                        <Text style={styles.infoText}>{comuna}</Text>
                      </View>
                    ) : null}
                    {telefono ? (
                      <View style={styles.infoRow}>
                        <AppIcon name="phone-outline" size={14} color={colors.slate} />
                        <Text style={styles.infoText}>{telefono}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoRow}>
                      <AppIcon name="calendar-check-outline" size={14} color={colors.slate} />
                      <Text style={styles.infoText}>
                        {loadingAttendance || !attendance
                          ? "Asistencia M: --% · A: --%"
                          : `Asistencia M: ${attendance.monthPercent}% · A: ${attendance.yearPercent}%`}
                      </Text>
                    </View>
                  </View>

                  {/* Footer: botón de nuevo registro */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      style={styles.newEntryBtn}
                      onPress={() => router.push(`/editor/participante/${item.id}/nuevo-registro` as any)}
                    >
                      <AppIcon name="plus" size={14} color={colors.teal} />
                      <Text style={styles.newEntryBtnText}>Nuevo registro</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

function getEmptyMessage(search: string, salonCount: number): string {
  if (search.trim()) return "Sin resultados para tu búsqueda.";
  if (salonCount === 0) return "No tienes salones asignados aún.";
  return "No hay participantes en tus salones.";
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function getComunaFromBaseData(person: Person): string | null {
  const v = person.baseData?.comuna;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function getTelefonoFromBaseData(person: Person): string | null {
  const v = person.baseData?.telefono ?? person.baseData?.telefono_apoderado;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  pageTitle: { fontSize: 20, fontWeight: "700", color: colors.ink },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  profilePillText: { fontSize: 12, fontWeight: "600", color: colors.tealDark },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.72)",
    marginBottom: spacing.md,
    ...shadow.soft,
    shadowOpacity: 0.04,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 6 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center" },
  // --- Card ---
  card: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardInfoCol: { flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: "#fff" },
  avatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: colors.tealDark, fontSize: 14, fontWeight: "700" },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    alignSelf: "flex-start",
    backgroundColor: colors.amberTint,
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  planBadgeText: { fontSize: 11, fontWeight: "600", color: colors.amber },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotActive: { backgroundColor: "#22C55E" },
  statusDotInactive: { backgroundColor: colors.slate },
  infoGrid: { marginTop: spacing.sm, gap: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: colors.slate, flex: 1 },
  cardFooter: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  newEntryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  newEntryBtnText: { fontSize: 12, fontWeight: "700", color: colors.teal },
});

