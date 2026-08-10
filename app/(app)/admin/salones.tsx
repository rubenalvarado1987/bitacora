import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { Salon, SalonSchedule, SalonScheduleEntry } from "../../../src/types";
import Breadcrumb from "../../../src/components/Breadcrumb";
import TimeField from "../../../src/components/TimeField";
import { SalonDraft, listenSalons, removeSalon, saveSalon } from "../../../src/data/adminRepository";
import AppIcon from "../../../src/components/AppIcon";
import { useSnackbar } from "../../../src/context/SnackbarContext";
import { showAlert } from "../../../src/utils/alert";

const SCHEDULE_OPTIONS = [
  { value: "mañana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "extendida", label: "Extendida" },
] as const;

const SALON_COLORS = [
  { label: "Verde",   value: "#1F6F6B" },
  { label: "Azul",    value: "#2563EB" },
  { label: "Índigo",  value: "#4F46E5" },
  { label: "Violeta", value: "#7C3AED" },
  { label: "Rosa",    value: "#DB2777" },
  { label: "Rojo",    value: "#DC2626" },
  { label: "Naranja", value: "#EA580C" },
  { label: "Lima",    value: "#65A30D" },
  { label: "Cian",    value: "#0891B2" },
  { label: "Gris",    value: "#475569" },
];

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
  schedule: [],
  maxCapacity: "",
  educationalLevel: "",
  color: null,
};

export default function SalonsScreen() {
  const { membership } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<Salon[]>([]);
  const [draft, setDraft] = useState<SalonDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  const reset = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!draft.name.trim()) {
      showAlert("Faltan datos", "Completa el nombre del salón.");
      return;
    }
    for (const entry of draft.schedule ?? []) {
      if (!entry.startTime || !entry.endTime) {
        showAlert("Horario incompleto", `Completa inicio y término para la jornada ${labelForSchedule(entry.type)}.`);
        return;
      }
      if (entry.endTime <= entry.startTime) {
        showAlert("Horario inválido", `La hora de término debe ser posterior a la de inicio en ${labelForSchedule(entry.type)}.`);
        return;
      }
    }
    setSaving(true);
    try {
      await saveSalon(membership.organizationId, draft, editingId ?? undefined);
      reset();
      showSnackbar("Guardado exitosamente");
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (salon: Salon) => {
    setEditingId(salon.id);
    setDraft({
      name: salon.name,
      active: salon.active,
      professionalIds: salon.professionalIds,
      participantIds: salon.participantIds,
      schedule: normalizeSchedule(salon.schedule),
      maxCapacity: salon.maxCapacity ?? "",
      educationalLevel: salon.educationalLevel ?? "",
      color: salon.color ?? null,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!membership?.organizationId || !confirmDeleteId) return;
    const idToDelete = confirmDeleteId;
    setConfirmDeleteId(null);
    await removeSalon(membership.organizationId, idToDelete);
    if (editingId === idToDelete) reset();
  };

  const normalizeSchedule = (value?: SalonSchedule | string): SalonSchedule => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return [{ type: value as SalonScheduleEntry["type"], startTime: "", endTime: "" }];
    return [];
  };

  const labelForSchedule = (type: SalonScheduleEntry["type"]) =>
    SCHEDULE_OPTIONS.find((o) => o.value === type)?.label ?? type;

  const toggleSchedule = (type: SalonScheduleEntry["type"]) => {
    setDraft((prev) => {
      const current = prev.schedule ?? [];
      const exists = current.find((s) => s.type === type);
      if (exists) return { ...prev, schedule: current.filter((s) => s.type !== type) };
      return { ...prev, schedule: [...current, { type, startTime: "", endTime: "" }] };
    });
  };

  const updateScheduleTime = (type: SalonScheduleEntry["type"], field: keyof Pick<SalonScheduleEntry, "startTime" | "endTime">, value: string) => {
    setDraft((prev) => ({
      ...prev,
      schedule: (prev.schedule ?? []).map((s) => (s.type === type ? { ...s, [field]: value } : s)),
    }));
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Modal confirmación eliminación */}
      <Modal visible={!!confirmDeleteId} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmDeleteId(null)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <AppIcon name="trash-can-outline" size={32} color={colors.danger} />
            <Text style={styles.confirmTitle}>¿Eliminar salón?</Text>
            <Text style={styles.confirmBody}>Esta acción no se puede deshacer.</Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setConfirmDeleteId(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmDelete} onPress={handleDelete}>
                <Text style={styles.confirmDeleteText}>Eliminar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal formulario */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={reset}>
        <Pressable style={styles.modalOverlay} onPress={reset}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.sectionLabel}>{editingId ? "Editar salón" : "Nuevo salón"}</Text>
                <Pressable onPress={reset} style={styles.modalCloseBtn} hitSlop={8}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <TextInput
                value={draft.name}
                onChangeText={(value) => setDraft({ ...draft, name: value })}
                placeholder="Nombre del salón"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Jornada</Text>
              {SCHEDULE_OPTIONS.map((option) => {
                const entry = draft.schedule?.find((s) => s.type === option.value);
                const isSelected = !!entry;
                return (
                  <View key={option.value} style={styles.scheduleOption}>
                    <Pressable
                      onPress={() => toggleSchedule(option.value)}
                      style={[styles.checkboxRow, isSelected && styles.checkboxRowActive]}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected ? <Text style={styles.check}>✓</Text> : null}
                      </View>
                      <Text style={[styles.checkboxLabel, isSelected && styles.checkboxLabelActive]}>{option.label}</Text>
                    </Pressable>
                    {isSelected ? (
                      <View style={styles.timeRow}>
                        <View style={styles.timeField}>
                          <Text style={styles.timeLabel}>Inicio</Text>
                          <TimeField value={entry.startTime} onChange={(value) => updateScheduleTime(option.value, "startTime", value)} />
                        </View>
                        <View style={styles.timeField}>
                          <Text style={styles.timeLabel}>Término</Text>
                          <TimeField value={entry.endTime} onChange={(value) => updateScheduleTime(option.value, "endTime", value)} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}

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

              <Text style={styles.fieldLabel}>Color del salón (opcional)</Text>
              <View style={styles.colorRow}>
                {SALON_COLORS.map((c) => {
                  const isSelected = (draft.color || SALON_COLORS[0].value) === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setDraft({ ...draft, color: c.value })}
                      style={[styles.colorSwatch, { backgroundColor: c.value }, isSelected && styles.colorSwatchSelected]}
                    >
                      {isSelected ? <Text style={styles.colorCheck}>✓</Text> : null}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={() => setDraft({ ...draft, active: !draft.active })} style={styles.toggleButton}>
                <Text style={styles.toggleButtonText}>{draft.active ? "Activo" : "Inactivo"}</Text>
              </Pressable>

              <Pressable onPress={handleSave} disabled={saving} style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar salón</Text>}
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Salones" }]} />

        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Salones</Text>
          <Pressable onPress={openNew} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Agregar</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <Text style={styles.empty}>No hay salones creados aún.</Text>
        ) : null}

        {items.map((salon) => {
          const salonColor = salon.color || SALON_COLORS[0].value;
          return (
            <View key={salon.id} style={[styles.listCard, { borderLeftWidth: 4, borderLeftColor: salonColor }]}>
              <View style={styles.listTitleRow}>
                <View style={[styles.listColorDot, { backgroundColor: salonColor }]} />
                <Text style={styles.listTitle}>{salon.name}</Text>
              </View>
              <Text style={styles.listBody}>Profesionales: {salon.professionalIds.length} · Participantes: {salon.participantIds.length}</Text>
              <Text style={styles.listBody}>
                {(() => {
                  const schedule = normalizeSchedule(salon.schedule);
                  return schedule.length > 0
                    ? schedule.map((s) => `${labelForSchedule(s.type)} ${s.startTime}-${s.endTime}`).join(" · ")
                    : "Sin jornada";
                })()}
                {salon.maxCapacity ? ` · Capacidad: ${salon.maxCapacity}` : ""}
              </Text>
              <Text style={styles.listBody}>
                {salon.educationalLevel
                  ? `Nivel: ${EDUCATIONAL_LEVEL_OPTIONS.find((o) => o.value === salon.educationalLevel)?.label ?? salon.educationalLevel}`
                  : "Sin nivel educativo"}
              </Text>
              <Text style={styles.listBody}>{salon.active ? "Activo" : "Inactivo"}</Text>
              <View style={styles.actionsRow}>
                <Pressable onPress={() => startEdit(salon)} hitSlop={8} style={[styles.iconBtn, { borderColor: salonColor }]}>
                  <AppIcon name="pencil-outline" size={15} color={salonColor} />
                </Pressable>
                <Pressable onPress={() => setConfirmDeleteId(salon.id)} hitSlop={8} style={[styles.iconBtn, { borderColor: colors.ink }]}>
                  <AppIcon name="trash-can-outline" size={15} color={colors.ink} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  pageTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  addButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  empty: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: spacing.lg },
  modalCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, width: "100%", maxWidth: 480, maxHeight: "90%", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 12, color: colors.slate, fontWeight: "700", lineHeight: 14 },
  // Confirmación
  confirmCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, width: "100%", maxWidth: 320, alignItems: "center", gap: spacing.sm },
  confirmTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, textAlign: "center" },
  confirmBody: { fontSize: 13, color: colors.slate, textAlign: "center" },
  confirmActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, width: "100%" },
  confirmCancel: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  confirmCancelText: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  confirmDelete: { flex: 1, backgroundColor: colors.danger, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  confirmDeleteText: { fontSize: 14, color: "#fff", fontWeight: "700" },
  // Formulario
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 0 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  chipTextActive: { color: colors.tealDark },
  scheduleOption: { marginBottom: spacing.sm },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper },
  checkboxRowActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.slate, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  check: { color: "#fff", fontSize: 10, fontWeight: "800" },
  checkboxLabel: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  checkboxLabelActive: { color: colors.tealDark },
  timeRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, paddingLeft: spacing.md },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 11, color: colors.slate, marginBottom: spacing.xs },
  toggleButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" as const, marginBottom: spacing.sm },
  toggleButtonText: { color: colors.ink, fontWeight: "700" },
  primaryButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.xs },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  primaryButtonDisabled: { opacity: 0.6 },
  // Cards lista
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 2 },
  listColorDot: { width: 10, height: 10, borderRadius: 5 },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  listBody: { fontSize: 12, color: colors.slate, marginTop: spacing.xs },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  colorSwatchSelected: { borderWidth: 2.5, borderColor: colors.ink },
  colorCheck: { color: "#fff", fontSize: 14, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  iconBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: "center" as const, justifyContent: "center" as const },
});
