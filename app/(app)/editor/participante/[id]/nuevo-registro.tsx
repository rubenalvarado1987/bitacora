import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../../src/context/AuthContext";
import { listenParticipants } from "../../../../../src/data/adminRepository";
import { createEntryBulk, EntryDraft } from "../../../../../src/data/entriesRepository";
import { entryTemplateSections } from "../../../../../src/data/businessCatalog";
import { FieldInput } from "../../../../../src/components/SectionField";
import AppIcon from "../../../../../src/components/AppIcon";
import Breadcrumb from "../../../../../src/components/Breadcrumb";
import { getSectionIconName } from "../../../../../src/data/sectionIcons";
import { colors, radius, shadow, spacing } from "../../../../../src/theme";
import { Person } from "../../../../../src/types";
import { showAlert } from "../../../../../src/utils/alert";

// Paleta semántica igual que TimelineEntryCard
const SECTION_COLORS: Record<string, { active: string; activeTint: string }> = {
  alimentacion:        { active: "#C53030", activeTint: "#FFEEEE" },
  actividades:         { active: "#9A3412", activeTint: "#FFF0E6" },
  asistencia:          { active: "#166534", activeTint: "#DCFCE7" },
  emocional:           { active: "#1E40AF", activeTint: "#EFF6FF" },
  descanso:            { active: "#5B21B6", activeTint: "#F5F3FF" },
  higiene:             { active: "#0F766E", activeTint: "#F0FDFA" },
  "medicamentos-registro": { active: "#0369A1", activeTint: "#F0F9FF" },
  extras:              { active: "#374151", activeTint: "#F9FAFB" },
};

function getSectionColor(id: string) {
  return SECTION_COLORS[id] ?? { active: colors.tealDark, activeTint: colors.tealTint };
}

export default function EditorNuevoRegistroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();

  const [participants, setParticipants] = useState<Person[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(id ? [id] : []);
  const [activeSectionId, setActiveSectionId] = useState(entryTemplateSections[0].id);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsub = listenParticipants(membership.organizationId, (items) => {
      setParticipants(items);
      setLoadingParticipants(false);
    });
    return unsub;
  }, [membership?.organizationId]);

  const activeSection = entryTemplateSections.find((s) => s.id === activeSectionId)!;
  const activeCat = getSectionColor(activeSectionId);

  const toggleParticipant = (pid: string) => {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  };

  const handleSave = async () => {
    if (!membership?.organizationId || !user) return;
    if (selectedIds.length === 0) {
      showAlert("Sin participantes", "Selecciona al menos un participante.");
      return;
    }

    const missing = activeSection.fields
      .filter((f) => f.required && !values[f.id])
      .map((f) => f.label);
    if (missing.length > 0) {
      showAlert("Faltan campos", `Completa: ${missing.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const draft: EntryDraft = {
        type: activeSection.title,
        values: values as Record<string, string | number | boolean>,
      };
      await createEntryBulk(
        membership.organizationId,
        selectedIds,
        draft,
        user.uid,
        membership.name ?? user.email ?? "Editor"
      );
      router.back();
    } catch (e) {
      console.warn("Error al guardar:", e);
      showAlert("Error", "No se pudo guardar el registro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerPad}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Mis participantes", href: "/editor" },
            { label: "Participante", href: id ? `/editor/participante/${id}` : "/editor" },
            { label: "Nuevo registro" },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Selector de tipo */}
        <Text style={styles.sectionLabel}>Tipo de registro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {entryTemplateSections.map((s) => {
            const isActive = activeSectionId === s.id;
            const cat = getSectionColor(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => { setActiveSectionId(s.id); setValues({}); }}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: cat.activeTint, borderColor: cat.active },
                ]}
              >
                <AppIcon
                  name={getSectionIconName(s.id ?? s.title)}
                  size={16}
                  color={isActive ? cat.active : colors.slate}
                />
                <Text style={[styles.chipText, isActive && { color: cat.active }]}>
                  {s.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Card de campos con borde del color de la categoría */}
        <View style={[styles.fieldsCard, { borderColor: activeCat.active }]}>
          <View style={styles.fieldsTitleRow}>
            <View style={[styles.fieldsTitleIcon, { backgroundColor: activeCat.activeTint }]}>
              <AppIcon name={getSectionIconName(activeSectionId)} size={18} color={activeCat.active} />
            </View>
            <Text style={[styles.fieldsSectionTitle, { color: activeCat.active }]}>
              {activeSection.title}
            </Text>
          </View>
          {activeSection.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}
        </View>

        {/* Selector de participantes */}
        <View style={styles.participantsCard}>
          <Text style={styles.participantsTitle}>
            Participantes
            <Text style={styles.participantsCount}> ({selectedIds.length} seleccionados)</Text>
          </Text>
          {loadingParticipants ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.sm }} />
          ) : (
            participants.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggleParticipant(p.id)} style={styles.checkRow}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked ? <AppIcon name="check" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={styles.checkLabel}>{p.name}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: activeCat.active }, saving && styles.saveButtonDisabled]}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : (
              <View style={styles.saveButtonInner}>
                <AppIcon name="content-save" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>
                  Guardar para {selectedIds.length} participante(s)
                </Text>
              </View>
            )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.72)",
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
    shadowOpacity: 0.04,
  },
  chipText: { fontSize: 13, color: colors.slate, fontWeight: "600", marginLeft: 8 },
  fieldsCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  fieldsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldsTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldsSectionTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  participantsCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  participantsTitle: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  participantsCount: { fontWeight: "400", color: colors.slate },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkLabel: { fontSize: 14, color: colors.ink, flex: 1 },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  saveButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...shadow.soft,
    shadowOpacity: 0.18,
  },
  saveButtonInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

