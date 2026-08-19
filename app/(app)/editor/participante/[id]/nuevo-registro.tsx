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
import { useAuth } from "../../../../../src/context/AuthContext";
import {
  listenMyProfile,
  listenParticipants,
  listenSalons,
} from "../../../../../src/data/adminRepository";
import { createEntryBulk, EntryDraft } from "../../../../../src/data/entriesRepository";
import { entryTemplateSections } from "../../../../../src/data/businessCatalog";
import { FieldInput } from "../../../../../src/components/SectionField";
import AppIcon from "../../../../../src/components/AppIcon";
import Breadcrumb from "../../../../../src/components/Breadcrumb";
import { getSectionIconName } from "../../../../../src/data/sectionIcons";
import { colors, radius, shadow, spacing } from "../../../../../src/theme";
import { Person, ProfileRecord, Salon, TemplateField } from "../../../../../src/types";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type SectionValues = Record<string, string | number>;
// Diccionario: sectionId → { fieldId: value }
type AllSectionValues = Record<string, SectionValues>;

interface SavedSummary {
  sectionTitle: string;
  fields: { label: string; value: string }[];
  participantCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Valores precargados por sección al visitarla por primera vez. */
function defaultValuesFor(sectionId: string): SectionValues {
  if (sectionId === "asistencia") {
    return { estado_asistencia: "Presente", fecha: todayISO() };
  }
  return {};
}

/** Devuelve los campos visibles respetando la regla dependsOn. */
function getVisibleFields(fields: TemplateField[], values: SectionValues): TemplateField[] {
  return fields.filter((f) => {
    if (!f.dependsOn) return true;
    return String(values[f.dependsOn.fieldId]) === f.dependsOn.value;
  });
}

// ─── Paleta semántica ─────────────────────────────────────────────────────────

const SECTION_COLORS: Record<string, { active: string; activeTint: string }> = {
  alimentacion:             { active: "#C53030", activeTint: "#FFEEEE" },
  actividades:              { active: "#9A3412", activeTint: "#FFF0E6" },
  asistencia:               { active: "#166534", activeTint: "#DCFCE7" },
  emocional:                { active: "#1E40AF", activeTint: "#EFF6FF" },
  descanso:                 { active: "#5B21B6", activeTint: "#F5F3FF" },
  higiene:                  { active: "#0F766E", activeTint: "#F0FDFA" },
  "medicamentos-registro":  { active: "#0369A1", activeTint: "#F0F9FF" },
  extras:                   { active: "#374151", activeTint: "#F9FAFB" },
};

function getSectionColor(id: string) {
  return SECTION_COLORS[id] ?? { active: colors.tealDark, activeTint: colors.tealTint };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditorNuevoRegistroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();

  // ── Datos externos ───────────────────────────────────────────────────────
  const [allParticipants, setAllParticipants] = useState<Person[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  // Estado explícito de carga del perfil propio, para distinguir "cargando" de "no existe"
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ── Estado del formulario ────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>(id ? [id] : []);
  const [activeSectionId, setActiveSectionId] = useState(entryTemplateSections[0].id);

  // Cada sección conserva sus propios valores independientemente.
  // Se inicializa la primera sección con sus defaults.
  const [allValues, setAllValues] = useState<AllSectionValues>({
    [entryTemplateSections[0].id]: defaultValuesFor(entryTemplateSections[0].id),
  });

  // ── Estado modal de confirmación ─────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  // ── Unsaved-changes guard ─────────────────────────────────────────────────
  // isDirtyRef: leído en el listener de navegación (evita closure estale)
  // isDirty (state): usado solo para re-renderizar la UI cuando cambia
  const isDirtyRef = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; icon?: string } | null>(null);
  // Ref para guardar la acción de navegación interceptada
  const pendingNavAction = useRef<(() => void) | null>(null);

  // ── Listeners ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!membership?.organizationId) return;
    const u1 = listenParticipants(membership.organizationId, (items) => {
      setAllParticipants(items);
      setLoadingParticipants(false);
    });
    const u2 = listenSalons(membership.organizationId, setSalons);
    return () => { u1(); u2(); };
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId || !membership?.uid) return;
    setLoadingProfile(true);
    return listenMyProfile(membership.organizationId, membership.uid, (profile) => {
      setMyProfile(profile);
      setLoadingProfile(false);
    });
  }, [membership?.organizationId, membership?.uid]);

  // Intercepta el back nativo (botón Android / swipe iOS / router.back()) cuando hay cambios sin guardar.
  // Usa isDirtyRef (no isDirty state) para leer siempre el valor actual sin re-registrar el listener.
  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (!isDirtyRef.current) return;  // sin cambios → dejar pasar
      e.preventDefault();               // bloquea la navegación
      pendingNavAction.current = () => navigation.dispatch(e.data.action);
      setShowLeaveWarning(true);
    });
    return unsub;
  }, [navigation]); // solo se registra una vez

  // ── Participantes filtrados por rol ──────────────────────────────────────

  // Si el perfil está cargando, esperar antes de mostrar lista
  // Si myProfile existe → el usuario es editor/profesional con salones asignados; filtrar
  // Si myProfile es null y terminó de cargar → usuario sin perfil (admin); ver todos
  const mySalonIds = useMemo<Set<string>>(() => {
    if (!myProfile) return new Set();
    return new Set([
      ...(myProfile.salonIds ?? []),
      ...salons.filter((s) => s.professionalIds.includes(myProfile.id)).map((s) => s.id),
    ]);
  }, [myProfile, salons]);

  const participants = useMemo<Person[]>(() => {
    // Mientras carga el perfil, no mostrar nada para evitar flash de lista completa
    if (loadingProfile) return [];
    // Sin perfil vinculado → es admin/lector; puede ver todos
    if (!myProfile) return allParticipants;
    // Con perfil → filtrar por salones asignados (igual que editor/index.tsx)
    if (mySalonIds.size === 0) return [];
    return allParticipants.filter((p) =>
      (p.salonIds ?? []).some((sid) => mySalonIds.has(sid))
    );
  }, [allParticipants, mySalonIds, myProfile, loadingProfile]);

  // ── Sección activa ───────────────────────────────────────────────────────

  const activeSection = entryTemplateSections.find((s) => s.id === activeSectionId)!;
  const activeCat = getSectionColor(activeSectionId);

  // Valores de la sección activa (nunca undefined)
  const currentValues: SectionValues = allValues[activeSectionId] ?? {};

  // Campos visibles según dependsOn
  const visibleFields = getVisibleFields(activeSection.fields, currentValues);

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Cambia de pestaña conservando los valores ya ingresados en cada sección. */
  function changeSection(sectionId: string) {
    setActiveSectionId(sectionId);
    // Si la sección no fue visitada aún, inicializarla con sus defaults
    setAllValues((prev) => {
      if (prev[sectionId] !== undefined) return prev; // ya tiene valores propios
      const defaults = defaultValuesFor(sectionId);
      return { ...prev, [sectionId]: defaults };
    });
  }

  /** Actualiza un campo de la sección activa sin tocar las demás secciones. */
  function setField(fieldId: string, value: string | number) {
    isDirtyRef.current = true;
    setIsDirty(true);
    setAllValues((prev) => ({
      ...prev,
      [activeSectionId]: { ...(prev[activeSectionId] ?? {}), [fieldId]: value },
    }));
  }

  function toggleParticipant(pid: string) {
    setSelectedIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
    );
  }

  async function handleSave() {
    if (!membership?.organizationId || !user) return;
    if (selectedIds.length === 0) {
      setAlertModal({ title: "Sin participantes", message: "Selecciona al menos un participante.", icon: "account-alert-outline" });
      return;
    }

    // Validar campos visibles con required
    const missing = visibleFields
      .filter((f) => f.required && !currentValues[f.id])
      .map((f) => f.label);
    if (missing.length > 0) {
      setAlertModal({ title: "Faltan campos", message: `Completa los siguientes campos:\n\n${missing.map((l) => `• ${l}`).join("\n")}`, icon: "alert-circle-outline" });
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
        selectedIds,
        draft,
        user.uid,
        membership.name ?? user.email ?? "Editor"
      );

      // Armar resumen con los campos visibles que tienen valor
      const summaryFields = visibleFields
        .filter((f) => currentValues[f.id] !== undefined && currentValues[f.id] !== "")
        .map((f) => ({ label: f.label, value: String(currentValues[f.id]) }));

      setSavedSummary({
        sectionTitle: activeSection.title,
        fields: summaryFields,
        participantCount: selectedIds.length,
      });
    } catch (e) {
      console.warn("Error al guardar:", e);
      setAlertModal({ title: "Error al guardar", message: "No se pudo guardar el registro. Intenta de nuevo.", icon: "close-circle-outline" });
    } finally {
      setSaving(false);
    }
  }

  function closeSummary() {
    setSavedSummary(null);
    // Limpiar solo la sección recién guardada y recalcular isDirty
    setAllValues((prev) => {
      const next = { ...prev, [activeSectionId]: defaultValuesFor(activeSectionId) };
      // Si el resto de secciones también están limpias, quitar el flag dirty
      const stillDirty = Object.entries(next).some(([sid, vals]) => {
        const defaults = defaultValuesFor(sid);
        return Object.entries(vals).some(([k, v]) => v !== "" && v !== undefined && String(v) !== String(defaults[k] ?? ""));
      });
      isDirtyRef.current = stillDirty;
      setIsDirty(stillDirty);
      return next;
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Modal de alerta de validación ── */}
      <Modal
        visible={alertModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAlertModal(null)}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.summaryIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <AppIcon
                name={(alertModal?.icon ?? "alert-circle-outline") as any}
                size={36}
                color={colors.amber}
              />
            </View>
            <Text style={styles.summaryTitle}>{alertModal?.title}</Text>
            <Text style={[styles.summarySubtitle, { textAlign: "left", alignSelf: "stretch" }]}>
              {alertModal?.message}
            </Text>
            <View style={styles.summaryActions}>
              <Pressable style={styles.summaryBtnAccept} onPress={() => setAlertModal(null)}>
                <Text style={styles.summaryBtnAcceptText}>Entendido</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal de advertencia cambios sin guardar ── */}
      <Modal
        visible={showLeaveWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveWarning(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLeaveWarning(false)}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.summaryIconWrap}>
              <AppIcon name="alert-circle-outline" size={36} color={colors.amber} />
            </View>
            <Text style={styles.summaryTitle}>Cambios sin guardar</Text>
            <Text style={styles.leaveWarningText}>
              Tienes información ingresada que no ha sido guardada. ¿Qué quieres hacer?
            </Text>

            {/* Secciones con datos pendientes */}
            <View style={styles.dirtySectionsWrap}>
              {entryTemplateSections
                .filter((s) => {
                  const vals = allValues[s.id];
                  if (!vals) return false;
                  const defaults = defaultValuesFor(s.id);
                  return Object.entries(vals).some(
                    ([k, v]) => v !== "" && v !== undefined && String(v) !== String(defaults[k] ?? "")
                  );
                })
                .map((s) => {
                  const cat = getSectionColor(s.id);
                  return (
                    <View key={s.id} style={[styles.dirtySectionChip, { backgroundColor: cat.activeTint, borderColor: cat.active }]}>
                      <AppIcon name={getSectionIconName(s.id)} size={13} color={cat.active} />
                      <Text style={[styles.dirtySectionLabel, { color: cat.active }]}>{s.title}</Text>
                    </View>
                  );
                })}
            </View>

            <View style={styles.summaryActions}>
              <Pressable
                style={styles.leaveDiscardBtn}
                onPress={() => {
                  setShowLeaveWarning(false);
                  pendingNavAction.current?.();
                  pendingNavAction.current = null;
                }}
              >
                <AppIcon name="delete-outline" size={16} color={colors.danger} />
                <Text style={styles.leaveDiscardText}>Descartar y salir</Text>
              </Pressable>
              <Pressable
                style={styles.summaryBtnAccept}
                onPress={() => setShowLeaveWarning(false)}
              >
                <Text style={styles.summaryBtnAcceptText}>Seguir editando</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal de resumen post-guardado ── */}
      <Modal
        visible={savedSummary !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSummary}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSummary}>
          <Pressable style={styles.summaryCard} onPress={(e) => e.stopPropagation()}>
            {/* Icono de éxito */}
            <View style={styles.summaryIconWrap}>
              <AppIcon name="check-circle" size={36} color={colors.green} />
            </View>

            <Text style={styles.summaryTitle}>¡Registro guardado!</Text>
            <Text style={styles.summarySubtitle}>
              {savedSummary?.sectionTitle} · {savedSummary?.participantCount} participante
              {(savedSummary?.participantCount ?? 0) > 1 ? "s" : ""}
            </Text>

            {/* Detalle de campos */}
            <View style={styles.summaryFields}>
              {savedSummary?.fields.map((f) => (
                <View key={f.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{f.label}</Text>
                  <Text style={styles.summaryValue}>{f.value}</Text>
                </View>
              ))}
            </View>

            {/* Botones */}
            <View style={styles.summaryActions}>
              <Pressable style={styles.summaryBtnAccept} onPress={closeSummary}>
                <Text style={styles.summaryBtnAcceptText}>Aceptar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <View style={styles.headerPad}>
        <Breadcrumb
          items={[
            { label: "Inicio", href: "/" },
            { label: "Participantes", href: "/editor" },
            { label: "Participante", href: id ? `/editor/participante/${id}` : "/editor" },
            { label: "Nuevo registro" },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── Selector de tipo ── */}
        <Text style={styles.sectionLabel}>Tipo de registro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {entryTemplateSections.map((s) => {
            const isActive = activeSectionId === s.id;
            const cat = getSectionColor(s.id);
            // Indicador de que la sección tiene datos ingresados
            const hasDraft = Boolean(
              allValues[s.id] && Object.values(allValues[s.id]).some((v) => v !== "" && v !== undefined)
            );
            return (
              <Pressable
                key={s.id}
                onPress={() => changeSection(s.id)}
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
                {/* Punto indicador de borrador */}
                {hasDraft && !isActive && (
                  <View style={[styles.draftDot, { backgroundColor: cat.active }]} />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Formulario de la sección activa ── */}
        <View style={[styles.fieldsCard, { borderColor: activeCat.active }]}>
          <View style={styles.fieldsTitleRow}>
            <View style={[styles.fieldsTitleIcon, { backgroundColor: activeCat.activeTint }]}>
              <AppIcon name={getSectionIconName(activeSectionId)} size={18} color={activeCat.active} />
            </View>
            <Text style={[styles.fieldsSectionTitle, { color: activeCat.active }]}>
              {activeSection.title}
            </Text>
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

        {/* ── Selector de participantes ── */}
        <View style={styles.participantsCard}>
          <Text style={styles.participantsTitle}>
            Participantes
            <Text style={styles.participantsCount}> ({selectedIds.length} seleccionados)</Text>
          </Text>

          {(loadingParticipants || loadingProfile) ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.sm }} />
          ) : participants.length === 0 ? (
            <Text style={styles.emptyText}>No hay participantes asignados a tus salones.</Text>
          ) : (
            participants.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => toggleParticipant(p.id)}
                  style={styles.checkRow}
                >
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <AppIcon name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkLabel}>{p.name}</Text>
                </Pressable>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.saveButton,
            { backgroundColor: activeCat.active },
            saving && styles.saveButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.saveButtonInner}>
              <AppIcon name="content-save" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>
                Guardar {activeSection.title} para {selectedIds.length} participante
                {selectedIds.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  // Pestañas
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
  draftDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginLeft: 6,
  },

  // Card de campos
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

  // Card de participantes
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
  emptyText: { fontSize: 13, color: colors.slate, paddingVertical: spacing.sm },
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

  // Footer
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

  // Modal de resumen
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 440,
    ...shadow.soft,
    shadowOpacity: 0.2,
  },
  summaryIconWrap: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center",
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    color: colors.slate,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  summaryFields: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 13, color: colors.slate, flex: 1 },
  summaryValue: { fontSize: 13, color: colors.ink, fontWeight: "600", flex: 1, textAlign: "right" },
  summaryActions: { gap: spacing.sm },
  summaryBtnAccept: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  summaryBtnAcceptText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Modal leave warning
  leaveWarningText: {
    fontSize: 14,
    color: colors.slate,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dirtySectionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  dirtySectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  dirtySectionLabel: { fontSize: 12, fontWeight: "600" },
  leaveDiscardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
  },
  leaveDiscardText: { color: colors.danger, fontWeight: "600", fontSize: 14 },

  summaryBtnBack: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  summaryBtnBackText: { color: colors.slate, fontSize: 14 },
});
