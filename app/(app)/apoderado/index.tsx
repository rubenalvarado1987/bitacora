import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { listenParticipants } from "../../../src/data/adminRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { Person } from "../../../src/types";

export default function ApoderadoPanelScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [participants, setParticipants] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenParticipants(membership.organizationId, (items) => {
      setParticipants(items);
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mis participantes" }} />
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay participantes asignados aún.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/apoderado/participante/${item.id}` as any)}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.status}</Text>
              <Text style={styles.readOnlyBadge}>Solo lectura</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { fontSize: 15, fontWeight: "700", color: colors.ink },
  meta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  readOnlyBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    backgroundColor: colors.amberTint,
    color: colors.amber,
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
});
