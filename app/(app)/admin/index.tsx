import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import Breadcrumb from "../../../src/components/Breadcrumb";

const cards = [
  { href: "/admin/dashboard", title: "Dashboard", body: "Resumen operativo: participantes, salones y agenda del día." },
  { href: "/admin/organizacion", title: "Organización", body: "Nombre y logo del jardín, visibles en toda la app." },
  { href: "/admin/salones", title: "Salones", body: "Crear salones y asignar participantes y profesionales." },
  { href: "/admin/planes", title: "Planes económicos", body: "Registrar planes y asociarlos a participantes." },
  { href: "/admin/perfiles", title: "Perfiles", body: "Crear y editar Editor, Lector y perfiles participantes." },
  { href: "/admin/participantes", title: "Participantes", body: "Alta, edición y ficha técnica del participante." },
];

export default function AdminHubScreen() {
  const router = useRouter();
  const { membership } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin" }]} />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Bitacora</Text>
        <Text style={styles.title}>Centro de administración</Text>
        <Text style={styles.subtitle}>
          Organización: {membership?.organizationId ?? "sin organización"}
        </Text>
      </View>

      {cards.map((card) => (
        <Pressable key={card.href} onPress={() => router.push(card.href as any)} style={styles.card}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardBody}>{card.body}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  kicker: { fontSize: 11, color: colors.teal, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginTop: spacing.xs },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  cardBody: { fontSize: 13, color: colors.slate, marginTop: spacing.xs, lineHeight: 18 },
});