import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { listenMyProfile } from "../../../../../src/data/adminRepository";
import { colors, spacing } from "../../../../../src/theme";
import { Entry, Person, ProfileRecord } from "../../../../../src/types";
import Breadcrumb from "../../../../../src/components/Breadcrumb";
import ProfileSidebar from "../../../../../src/components/ProfileSidebar";
import DailySummaryCard from "../../../../../src/components/DailySummaryCard";
import { TimelineEntryCard } from "../../../../../src/components/TimelineEntryCard";
import AppIcon from "../../../../../src/components/AppIcon";

const { width } = Dimensions.get("window");
const IS_WIDE = width >= 640;

export default function EditorParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
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
        <View style={styles.headerPad}>
          <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Mis participantes", href: "/editor" }]} />
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerPad}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Mis participantes", href: "/editor" },
            { label: person.name },
          ]}
        />
      </View>

      {IS_WIDE ? (
        <View style={styles.twoCol}>
          <View style={styles.sidebarCol}>
            <ProfileSidebar person={person} />
          </View>
          <ScrollView style={styles.mainCol} contentContainerStyle={styles.mainColContent}>
            {timelineContent}
          </ScrollView>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.singleColContent}>
          <ProfileSidebar person={person} />
          <View>{timelineContent}</View>
        </ScrollView>
      )}

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
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  twoCol: { flex: 1, flexDirection: "column", paddingHorizontal: spacing.lg },
  sidebarCol: {},
  mainCol: { flex: 1 },
  mainColContent: { paddingBottom: spacing.xl + 80 },
  singleColContent: { padding: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
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

