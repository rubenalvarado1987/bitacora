import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { Person, Template, TemplateField } from "../../../../src/types";
import { FieldInput } from "../../../../src/components/SectionField";
import { colors, radius, shadow, spacing } from "../../../../src/theme";
import { createEntryBulk, EntryDraft } from "../../../../src/data/entriesRepository";
import { entryTemplateSections } from "../../../../src/data/businessCatalog";
import AppIcon from "../../../../src/components/AppIcon";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import { getSectionIconName } from "../../../../src/data/sectionIcons";

// ─── Colores por sección ──────────────────────────────────────────────────────
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function defaultValuesFor(sectionId: string): Record<string, string | number> {
  if (sectionId === "asistencia") return { estado_asistencia: "Presente", fecha: todayISO() };
  return {};
}

function getVisibleFields(fields: TemplateField[], values: Record<string, string | number>): TemplateField[] {
  return fields.filter((f) => {
    if (!f.dependsOn) return true;
    return String(values[f.dependsOn.fieldId] ?? "") === f.dependsOn.value;
  });
}

type SectionValues = Record<string, string | number>;
type AllSectionValues = Record<string, SectionValues>;

export default function NuevoRegistroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  const [person, setPerson] = useState<Person | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeSectionId, setActiveSectionId] = useState(entryTemplateSections[0].id);
  const [allValues, setAllValues] = useState<AllSectionValues>({});

  // Dirty tracking
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const pendingNavAction = useRef<(() => void) | null>(null);

  // Alert modal
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  // Success modal
  const [savedSummary, setSavedSummary] = useState<{ sectionTitle: string; fields: { label: string; value: string }[] } | null>(null);

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

  // Interceptar navegación con cambios pendientes
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      pendingNavAction.current = () => navigation.dispatch(e.data.action);
      setShowLeaveWarning(true);
    });
    return unsub;
  }, [navigation]);

  const activeSection = entryTemplateSections.find((s) => s.id === activeSectionId) ?? entryTemplateSections[0];
  const activeCat = getSectionColor(activeSectionId);

  const currentValues = useMemo<SectionValues>(
    () => allValues[activeSectionId] ?? defaultValuesFor(activeSectionId),
    [allValues, activeSectionId]
  );

  const visibleFields = useMemo(
    () => getVisibleFields(activeSection.fields, currentValues),
    [activeSection.fields, currentValues]
  );

  function changeSection(sectionId: string) {
    setActiveSectionId(sectionId);
    // Inicializar defaults solo si es la primera vez
    setAllValues((prev) => {
      if (prev[sectionId]) return prev;
      return { ...prev, [sectionId]: defaultValuesFor(sectionId) };
    });
  }

  function setField(fieldId: string, value: string | number) {
    isDirtyRef.current = true;
    setIsDirty(true);
    setAllValues((prev) => ({
      ...prev,
      [activeSectionId]: { ...(prev[activeSectionId] ?? defaultValuesFor(activeSectionId)), [fieldId]: value },
    }));
  }

  function closeSummary() {
    setSavedSummary(null);
    // Limpiar sección guardada
    setAllValues((prev) => {
      const next = { ...prev };
      delete next[activeSectionId];
      return next;
    });
    const stillDirty = Object.keys(allValues).filter((k) => k !== activeSectionId).length > 0;
    isDirtyRef.current = stillDirty;
    setIsDirty(stillDirty);
  }

  const handleSave = async () => {
    if (!canEdit) {
      setAlertModal({ title: "Sin permisos", message: "Solo admin y profesionales pueden crear registros." });
      return;
    }
    if (!membership?.organizationId || !user || !id) return;

    const missing = visibleFields
      .filter((f) => f.required && (currentValues[f.id] === undefined || currentValues[f.id] === ""))
      .map((f) => f.label);
    if (missing.length > 0) {
      setAlertModal({
        title: "Faltan campos",
        message: `Completa los siguientes campos:\n\n${missing.map((l) => `• ${l}`).join("\n")}`,
      });
      return;
    }

    setSaving(true);
    try {
      const draft: EntryDraft = {
        type: activeSection.title,
        values: currentValues as Record<string, string | number | boolean>,
      };
      await createEntryBulk(
        membership.organizationId,
        [id],
        draft,
        user.uid,
        membership.name ?? user.email ?? "Admin"
      );

      // Mostrar resumen
      const summaryFields = visibleFields
        .filter((f) => currentValues[f.id] !== undefined && currentValues[f.id] !== "")
        .map((f) => ({ label: f.label, value: String(currentValues[f.id]) }));
      setSavedSummary({ sectionTitle: activeSection.title, fields: summaryFields });

    } catch (error) {
      console.warn("Error al guardar el registro:", error);
      setAlertModal({ title: "Error al guardar", message: "No se pudo guardar el registro. Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  };

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

  // Secciones con datos pendientes
  const dirtySections = entryTemplateSections.filter(
    (s) => allValues[s.id] && Object.keys(allValues[s.id]).length > 0
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerPad}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: person?.name ?? "Participante", href: id ? `/person/${id}` : "/" },
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
            const hasDraft = Boolean(allValues[s.id] && Object.keys(allValues[s.id]).length > 0);
            return (
              <Pressable
                key={s.id}
                onPress={() => changeSection(s.id)}
                style={[
                  styles.chip,
                  isActive && { backgroundColor: cat.activeTint, borderColor: cat.active },
                ]}
              >
                <AppIcon name={getSectionIconName(s.id ?? s.title)} size={16} color={isActive ? cat.active : colors.slate} />
                <Text style={[styles.chipText, isActive && { color: cat.active }]}>{s.title}</Text>
                {hasDraft && !isActive && (
                  <View style={[styles.draftDot, { backgroundColor: cat.active }]} />
                )}
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
          {visibleFields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={currentValues[field.id]}
              onChange={(v) => setField(field.id, v)}
              accentColor={activeCat.active}
              accentTint={activeCat.activeTint}
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
              <Text style={styles.saveButtonText}>Guardar {activeSection.title}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Modal alerta de validación ── */}
      <Modal visible={alertModal !== null} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAlertModal(null)}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <AppIcon name="alert-circle-outline" size={36} color="#D97706" />
            </View>
            <Text style={styles.summaryTitle}>{alertModal?.title}</Text>
            <Text style={[styles.summarySubtitle, { textAlign: "left", alignSelf: "stretch" }]}>{alertModal?.message}</Text>
            <Pressable style={styles.summaryBtnAccept} onPress={() => setAlertModal(null)}>
              <Text style={styles.summaryBtnAcceptText}>Entendido</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal éxito ── */}
      <Modal visible={savedSummary !== null} transparent animationType="fade" onRequestClose={closeSummary}>
        <Pressable style={styles.modalOverlay} onPress={closeSummary}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#DCFCE7" }]}>
              <AppIcon name="check-circle-outline" size={36} color="#16A34A" />
            </View>
            <Text style={styles.summaryTitle}>Registro guardado</Text>
            <Text style={styles.summarySubtitle}>{savedSummary?.sectionTitle}</Text>
            {savedSummary?.fields.map((f) => (
              <View key={f.label} style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>{f.label}</Text>
                <Text style={styles.summaryRowValue}>{f.value}</Text>
              </View>
            ))}
            <Pressable style={styles.summaryBtnAccept} onPress={closeSummary}>
              <Text style={styles.summaryBtnAcceptText}>Aceptar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal advertencia cambios sin guardar ── */}
      <Modal visible={showLeaveWarning} transparent animationType="fade" onRequestClose={() => setShowLeaveWarning(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLeaveWarning(false)}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <AppIcon name="alert-circle-outline" size={36} color="#D97706" />
            </View>
            <Text style={styles.summaryTitle}>¿Salir sin guardar?</Text>
            {dirtySections.length > 0 && (
              <Text style={styles.summarySubtitle}>
                Tienes cambios en: {dirtySections.map((s) => s.title).join(", ")}
              </Text>
            )}
            <View style={styles.leaveActions}>
              <Pressable
                style={styles.leaveDiscardBtn}
                onPress={() => {
                  setShowLeaveWarning(false);
                  pendingNavAction.current?.();
                  pendingNavAction.current = null;
                }}
              >
                <Text style={styles.leaveDiscardText}>Descartar y salir</Text>
              </Pressable>
              <Pressable style={styles.summaryBtnAccept} onPress={() => setShowLeaveWarning(false)}>
                <Text style={styles.summaryBtnAcceptText}>Seguir editando</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
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
  draftDot: { width: 7, height: 7, borderRadius: 4, marginLeft: 5 },
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
  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: spacing.sm,
    ...shadow.soft,
  },
  summaryIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  summarySubtitle: { fontSize: 13, color: colors.slate, textAlign: "center" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing.xs,
  },
  summaryRowLabel: { fontSize: 12, color: colors.slate, flex: 1 },
  summaryRowValue: { fontSize: 12, color: colors.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  summaryBtnAccept: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  summaryBtnAcceptText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  leaveActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
  leaveDiscardBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    marginTop: spacing.sm,
  },
  leaveDiscardText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
});
