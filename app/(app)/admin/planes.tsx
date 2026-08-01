import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { EconomicPlan } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import DateField from "../../../src/components/DateField";
import { PlanDraft, listenPlans, removePlan, savePlan } from "../../../src/data/adminRepository";
import { showAlert } from "../../../src/utils/alert";

const PERIOD_OPTIONS = ["Mensual", "Trimestral", "Anual"] as const;

const emptyDraft: PlanDraft = { name: "", cost: 0, period: "Mensual", validUntil: "", active: true };

export default function PlansScreen() {
  const { membership } = useAuth();
  const [items, setItems] = useState<EconomicPlan[]>([]);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenPlans(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  const reset = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!draft.name.trim()) {
      showAlert("Faltan datos", "Completa el nombre del plan.");
      return;
    }
    try {
      await savePlan(membership.organizationId, draft, editingId ?? undefined);
      reset();
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const startEdit = (plan: EconomicPlan) => {
    setEditingId(plan.id);
    setDraft({
      name: plan.name,
      cost: plan.cost,
      period: plan.period,
      validUntil: plan.validUntil ?? "",
      active: plan.active,
    });
  };

  const handleDelete = async (planId: string) => {
    if (!membership?.organizationId) return;
    await removePlan(membership.organizationId, planId);
    if (editingId === planId) reset();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Planes económicos" }]} />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{editingId ? "Editar plan" : "Nuevo plan"}</Text>
        <TextInput value={draft.name} onChangeText={(value) => setDraft({ ...draft, name: value })} placeholder="Nombre" style={styles.input} />
        <TextInput value={String(draft.cost)} onChangeText={(value) => setDraft({ ...draft, cost: Number(value) || 0 })} placeholder="Costo" keyboardType="numeric" style={styles.input} />

        <Text style={styles.fieldLabel}>Periodo</Text>
        <View style={styles.chipRow}>
          {PERIOD_OPTIONS.map((period) => (
            <Pressable
              key={period}
              onPress={() => setDraft({ ...draft, period })}
              style={[styles.chip, draft.period === period && styles.chipActive]}
            >
              <Text style={[styles.chipText, draft.period === period && styles.chipTextActive]}>{period}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Vigencia</Text>
        <DateField value={draft.validUntil ?? ""} onChange={(iso) => setDraft({ ...draft, validUntil: iso })} placeholder="Seleccionar fecha límite" />

        <Pressable onPress={() => setDraft({ ...draft, active: !draft.active })} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>{draft.active ? "Activo" : "Inactivo"}</Text>
        </Pressable>
        <Pressable onPress={handleSave} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Guardar plan</Text></Pressable>
        <Pressable onPress={reset} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Limpiar</Text></Pressable>
      </View>

      {items.map((plan) => (
        <View key={plan.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{plan.name}</Text>
          <Text style={styles.listBody}>{plan.cost} · {plan.period} · {plan.active ? "Activo" : "Inactivo"}</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => startEdit(plan)}><Text style={styles.actionLink}>Editar</Text></Pressable>
            <Pressable onPress={() => handleDelete(plan.id)}><Text style={styles.actionDanger}>Eliminar</Text></Pressable>
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