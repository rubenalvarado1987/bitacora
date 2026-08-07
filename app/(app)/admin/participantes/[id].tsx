import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../src/context/AuthContext";
import { colors, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import ParticipantForm from "../../../../src/components/admin/ParticipantForm";
import { listenParticipants } from "../../../../src/data/adminRepository";
import { Person } from "../../../../src/types";

export default function EditParticipantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenParticipants(membership.organizationId, (list) => {
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  const participant = items.find((item) => item.id === id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: "Panel Admin", href: "/admin" },
          { label: "Participantes", href: "/admin/participantes" },
          { label: participant?.name ?? "Editar" },
        ]}
      />
      {loading ? <ActivityIndicator color={colors.teal} /> : null}
      {!loading && participant ? (
        <ParticipantForm participant={participant} onSaved={() => router.replace("/admin/participantes")} />
      ) : null}
      {!loading && !participant ? <Text style={styles.notFound}>No se encontró el participante.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  notFound: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
});
