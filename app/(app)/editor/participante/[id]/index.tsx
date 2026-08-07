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
import { db } from "../../../../../src/firebase";
import { useAuth } from "../../../../../src/context/AuthContext";
import { listenEntries } from "../../../../../src/data/entriesRepository";
import { listenMyProfile, listenSalons } from "../../../../../src/data/adminRepository";
import { colors, spacing } from "../../../../../src/theme";
import { Entry, Person, ProfileRecord, Salon } from "../../../../../src/types";
import Breadcrumb from "../../../../../src/components/Breadcrumb";
import ProfileSidebar from "../../../../../src/components/ProfileSidebar";
import DailySummaryCard from "../../../../../src/components/DailySummaryCard";
import { TimelineEntryCard } from "../../../../../src/components/TimelineEntryCard";

export default function EditorParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  singleColContent: { padding: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
  timelineWrap: {},
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
});

