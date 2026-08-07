import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { colors, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import ParticipantForm from "../../../../src/components/admin/ParticipantForm";

export default function NewParticipantScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: "Panel Admin", href: "/admin" },
          { label: "Participantes", href: "/admin/participantes" },
          { label: "Nuevo" },
        ]}
      />
      <ParticipantForm onSaved={() => router.replace("/admin/participantes")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
