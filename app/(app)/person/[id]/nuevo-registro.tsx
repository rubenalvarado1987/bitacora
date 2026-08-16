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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { Person, Template } from "../../../../src/types";
import { FieldInput } from "../../../../src/components/SectionField";
import { colors, radius, shadow, spacing } from "../../../../src/theme";
import { showAlert } from "../../../../src/utils/alert";
import { createEntryBulk, EntryDraft } from "../../../../src/data/entriesRepository";
import { entryTemplateSections } from "../../../../src/data/businessCatalog";
import AppIcon from "../../../../src/components/AppIcon";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import { getSectionIconName } from "../../../../src/data/sectionIcons";

const SECTION_COLORS: Record<string, { active: string; activeTint: string }> = {
  alimentacion: { active: "#C53030", activeTint: "#FFEEEE" },
  actividades: { active: "#9A3412", activeTint: "#FFF0E6" },
  asistencia: { active: "#166534", activeTint: "#DCFCE7" },
  emocional: { active: "#1E40AF", activeTint: "#EFF6FF" },
  descanso: { active: "#5B21B6", activeTint: "#F5F3FF" },
  higiene: { active: "#0F766E", activeTint: "#F0FDFA" },
  "medicamentos-registro": { active: "#0369A1", activeTint: "#F0F9FF" },
  extras: { active: "#374151", activeTint: "#F9FAFB" },
};

function getSectionColor(id: string) {
  return SECTION_COLORS[id] ?? { active: colors.tealDark, activeTint: colors.tealTint };
}

export default function NuevoRegistroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();

  const [person, setPerson] = useState<Person | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [activeSectionId, setActiveSectionId] = useState(entryTemplateSections[0].id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>({});

  const canEdit = membership?.role === "admin" || membership?.role === "editor" || membership?.role === "profesional";

  useEffect(() => {
    if (!membership?.organizationId || !id) return;

    (async () => {
      const personSnap = await getDoc(doc(db, "organizations", membership.organizationId, "people", id));
      if (personSnap.exists()) {
        const personData = { id: personSnap.id, ...personSnap.data() } as Person;
        setPerson(personData);
        const templateSnap = await getDoc(doc(db, "templates", personData.templateId));
        if (templateSnap.exists()) {
          setTemplate({ id: templateSnap.id, ...templateSnap.data() } as Template);
        }
      }
      setLoading(false);
    })();
  }, [membership?.organizationId, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!template || !membership) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No se pudo cargar la plantilla de esta ficha.</Text>
      </View>
    );
  }

  const activeSection = entryTemplateSections.find((s) => s.id === activeSectionId) ?? template.entrySections[0];
  const activeCat = getSectionColor(activeSectionId);

  const handleSave = async () => {
    if (!canEdit) {
      showAlert("Sin permisos", "Solo admin y profesionales pueden crear registros.");
      return;
    }
    if (!membership?.organizationId || !user || !id) return;

    const camposFaltantes = activeSection.fields.filter(
      (f) => f.required && (values[f.id] === undefined || values[f.id] === "")
    );

    if (camposFaltantes.length > 0) {
      showAlert("Faltan campos", `Completa: ${camposFaltantes.map((f) => f.label).join(", ")}`);
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
        [id],
        draft,
        user.uid,
        membership.name ?? user.email ?? "Admin"
      );
      router.back();
    } catch (error) {
      console.warn("Error al guardar el registro:", error);
      showAlert("Error", "No se pudo guardar el registro. Intenta de nuevo.");
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
            { label: "Bitácora", href: id ? `/person/${id}` : "/" },
            { label: "Nuevo registro" },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!canEdit ? (
          <View style={styles.readOnlyBanner}>
            <AppIcon name="lock-outline" size={16} color={colors.slate} />
            <Text style={styles.readOnlyText}>Solo admin y profesionales pueden crear registros.</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Tipo de registro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {entryTemplateSections.map((s) => {
            const isActive = activeSectionId === s.id;
            const cat = getSectionColor(s.id);
            return (
              <Pressable
                key={s.id}
                onPress={() => {
                  setActiveSectionId(s.id);
                  setValues({});
                }}
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
                <Text style={[styles.chipText, isActive && { color: cat.active }]}>{s.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.fieldsCard, { borderColor: activeCat.active }]}>
          <View style={styles.fieldsTitleRow}>
            <View style={[styles.fieldsTitleIcon, { backgroundColor: activeCat.activeTint }]}>
              <AppIcon name={getSectionIconName(activeSectionId)} size={18} color={activeCat.active} />
            </View>
            <Text style={[styles.fieldsSectionTitle, { color: activeCat.active }]}>{activeSection.title}</Text>
          </View>
          {activeSection.fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={values[field.id]}
              onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
            />
          ))}
        </View>

        {person ? (
          <View style={styles.personCard}>
            <Text style={styles.personTitle}>Participante</Text>
            <Text style={styles.personName}>{person.name}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving || !canEdit}
          style={[styles.saveButton, { backgroundColor: activeCat.active }, (saving || !canEdit) && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.saveButtonInner}>
              <AppIcon name="content-save" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Guardar registro</Text>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  fieldsTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  fieldsTitleIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  fieldsSectionTitle: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  personCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  personTitle: { fontSize: 12, color: colors.slate, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  personName: { fontSize: 14, color: colors.ink, fontWeight: "700", marginTop: spacing.xs },
  readOnlyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  readOnlyText: { color: colors.slate, fontSize: 12, fontWeight: "600" },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", padding: spacing.lg },
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
