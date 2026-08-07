import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import ProfileForm from "../../../../src/components/admin/ProfileForm";

export default function NewProfileScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: "Panel Admin", href: "/admin" },
          { label: "Profesionales", href: "/admin/profesionales" },
          { label: "Nuevo" },
        ]}
      />
      <ProfileForm onSaved={() => router.replace("/admin/profesionales")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
