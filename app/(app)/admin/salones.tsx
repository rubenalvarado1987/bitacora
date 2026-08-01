import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { Salon } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import { SalonDraft, listenSalons, removeSalon, saveSalon } from "../../../src/data/adminRepository";
import { showAlert } from "../../../src/utils/alert";

const SCHEDULE_OPTIONS = [
  { value: "mañana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "extendida", label: "Extendida" },
] as const;

const EDUCATIONAL_LEVEL_OPTIONS = [
  { value: "sala_cuna_menor", label: "Sala cuna menor" },
  { value: "sala_cuna_mayor", label: "Sala cuna mayor" },
  { value: "medio_menor", label: "Medio menor" },
  { value: "medio_mayor", label: "Medio mayor" },
  { value: "prekinder", label: "Prekínder" },
  { value: "kinder", label: "Kínder" },
] as const;

const emptyDraft: SalonDraft = {
  name: "",
  active: true,
  professionalIds: [],
  participantIds: [],
  schedule: "",
  maxCapacity: "",
  educationalLevel: "",
};

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
      schedule: salon.schedule ?? "",
      maxCapacity: salon.maxCapacity ?? "",
      educationalLevel: salon.educationalLevel ?? "",
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

        <Text style={styles.fieldLabel}>Jornada</Text>
        <View style={styles.chipRow}>
          {SCHEDULE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setDraft({ ...draft, schedule: option.value })}
              style={[styles.chip, draft.schedule === option.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, draft.schedule === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={draft.maxCapacity ? String(draft.maxCapacity) : ""}
          onChangeText={(value) => setDraft({ ...draft, maxCapacity: value ? Number(value.replace(/[^0-9]/g, "")) : "" })}
          placeholder="Capacidad máxima de alumnos"
          keyboardType="numeric"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Nivel educativo</Text>
        <View style={styles.chipRow}>
          {EDUCATIONAL_LEVEL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setDraft({ ...draft, educationalLevel: option.value })}
              style={[styles.chip, draft.educationalLevel === option.value && styles.chipActive]}
            >
              <Text style={[styles.chipText, draft.educationalLevel === option.value && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => setDraft({ ...draft, active: !draft.active })} style={styles.toggleButton}><Text style={styles.toggleButtonText}>{draft.active ? "Activo" : "Inactivo"}</Text></Pressable>
        <Pressable onPress={handleSave} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Guardar salón</Text></Pressable>
        <Pressable onPress={reset} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Limpiar</Text></Pressable>
      </View>

      {items.map((salon) => (
        <View key={salon.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{salon.name}</Text>
          <Text style={styles.listBody}>Profesionales: {salon.professionalIds.length} · Participantes: {salon.participantIds.length}</Text>
          <Text style={styles.listBody}>
            {salon.schedule ? `Jornada: ${salon.schedule}` : "Sin jornada"}
            {salon.maxCapacity ? ` · Capacidad: ${salon.maxCapacity}` : ""}
          </Text>
          <Text style={styles.listBody}>
            {salon.educationalLevel
              ? `Nivel: ${EDUCATIONAL_LEVEL_OPTIONS.find((o) => o.value === salon.educationalLevel)?.label ?? salon.educationalLevel}`
              : "Sin nivel educativo"}
          </Text>
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
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  chipTextActive: { color: colors.tealDark },
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