import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../src/context/AuthContext";
import { colors, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import ProfileForm from "../../../../src/components/admin/ProfileForm";
import { listenProfiles } from "../../../../src/data/adminRepository";
import { ProfileRecord } from "../../../../src/types";

export default function EditProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenProfiles(membership.organizationId, (list) => {
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  const profile = items.find((item) => item.id === id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: "Panel Admin", href: "/admin" },
          { label: "Profesionales", href: "/admin/profesionales" },
          { label: profile?.displayName ?? "Editar" },
        ]}
      />
      {loading ? <ActivityIndicator color={colors.teal} /> : null}
      {!loading && profile ? (
        <ProfileForm profile={profile} onSaved={() => router.replace("/admin/profesionales")} />
      ) : null}
      {!loading && !profile ? <Text style={styles.notFound}>No se encontró el profesional.</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  notFound: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
});
