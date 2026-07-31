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
import { colors, radius, spacing } from "../../../../../src/theme";
import { Person } from "../../../../../src/types";
import { showAlert } from "../../../../../src/utils/alert";

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
      <Stack.Screen options={{ title: "Nuevo registro", presentation: "modal" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Entry type selector */}
        <Text style={styles.sectionLabel}>Tipo de registro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {entryTemplateSections.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => { setActiveSectionId(s.id); setValues({}); }}
              style={[styles.chip, activeSectionId === s.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeSectionId === s.id && styles.chipTextActive]}>
                {s.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Dynamic fields */}
        <View style={styles.fieldsCard}>
          <Text style={styles.fieldsSectionTitle}>{activeSection.title}</Text>
          {activeSection.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}
        </View>

        {/* HU-18: multi-participant selector */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          Participantes ({selectedIds.length} seleccionados)
        </Text>
        {loadingParticipants ? (
          <ActivityIndicator color={colors.teal} />
        ) : (
          participants.map((p) => {
            const checked = selectedIds.includes(p.id);
            return (
              <Pressable key={p.id} onPress={() => toggleParticipant(p.id)} style={styles.checkRow}>
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>{p.name}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Guardando..." : `Guardar para ${selectedIds.length} participante(s)`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: colors.slate, marginBottom: spacing.sm },
  chipScroll: { marginBottom: spacing.lg },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: spacing.sm,
    backgroundColor: colors.paper,
  },
  chipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipText: { fontSize: 13, color: colors.slate, fontWeight: "600" },
  chipTextActive: { color: colors.tealDark },
  fieldsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fieldsSectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.tealDark,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  checkRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.teal, borderColor: colors.teal },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  checkLabel: { fontSize: 14, color: colors.ink },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
