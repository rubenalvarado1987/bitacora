import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { Salon } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import { SalonDraft, listenSalons, removeSalon, saveSalon } from "../../../src/data/adminRepository";
import { showAlert } from "../../../src/utils/alert";

const emptyDraft: SalonDraft = { name: "", active: true, professionalIds: [], participantIds: [] };

export default function SalonsScreen() {
  const { membership } = useAuth();
  const [items, setItems] = useState<Salon[]>([]);
  const [draft, setDraft] = useState<SalonDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  const reset = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!draft.name.trim()) {
      showAlert("Faltan datos", "Completa el nombre del salón.");
      return;
    }
    try {
      await saveSalon(membership.organizationId, draft, editingId ?? undefined);
      reset();
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const startEdit = (salon: Salon) => {
    setEditingId(salon.id);
    setDraft({
      name: salon.name,
      active: salon.active,
      professionalIds: salon.professionalIds,
      participantIds: salon.participantIds,
    });
  };

  const handleDelete = async (salonId: string) => {
    if (!membership?.organizationId) return;
    await removeSalon(membership.organizationId, salonId);
    if (editingId === salonId) reset();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Salones" }]} />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{editingId ? "Editar salón" : "Nuevo salón"}</Text>
        <TextInput value={draft.name} onChangeText={(value) => setDraft({ ...draft, name: value })} placeholder="Nombre del salón" style={styles.input} />
        <TextInput value={draft.professionalIds.join(", ")} onChangeText={(value) => setDraft({ ...draft, professionalIds: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="IDs de profesionales" style={styles.input} />
        <TextInput value={draft.participantIds.join(", ")} onChangeText={(value) => setDraft({ ...draft, participantIds: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="IDs de participantes" style={styles.input} />
        <Pressable onPress={() => setDraft({ ...draft, active: !draft.active })} style={styles.toggleButton}><Text style={styles.toggleButtonText}>{draft.active ? "Activo" : "Inactivo"}</Text></Pressable>
        <Pressable onPress={handleSave} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Guardar salón</Text></Pressable>
        <Pressable onPress={reset} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Limpiar</Text></Pressable>
      </View>

      {items.map((salon) => (
        <View key={salon.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{salon.name}</Text>
          <Text style={styles.listBody}>Profesionales: {salon.professionalIds.length} · Participantes: {salon.participantIds.length}</Text>
          <Text style={styles.listBody}>{salon.active ? "Activo" : "Inactivo"}</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => startEdit(salon)}><Text style={styles.actionLink}>Editar</Text></Pressable>
            <Pressable onPress={() => handleDelete(salon.id)}><Text style={styles.actionDanger}>Eliminar</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  toggleButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginBottom: spacing.sm },
  toggleButtonText: { color: colors.ink, fontWeight: "700" },
  primaryButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.xs },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  secondaryButtonText: { color: colors.ink, fontWeight: "600" },
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  listBody: { fontSize: 12, color: colors.slate, marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.teal, fontWeight: "700" },
  actionDanger: { color: colors.danger, fontWeight: "700" },
});