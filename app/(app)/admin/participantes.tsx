import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { showAlert } from "../../../src/utils/alert";
import Breadcrumb from "../../../src/components/Breadcrumb";
import { FieldInput } from "../../../src/components/SectionField";
import { isValidEmail } from "../../../src/utils/email";
import DropdownSelect from "../../../src/components/DropdownSelect";
import { useSnackbar } from "../../../src/context/SnackbarContext";
import { EconomicPlan, Organization, Person, Salon, Template } from "../../../src/types";
import {
  ParticipantDraft,
  listenParticipants,
  listenPlans,
  listenSalons,
  removeParticipant,
  saveParticipant,
  updateParticipantAccountEmail,
} from "../../../src/data/adminRepository";
import { provisionLinkedAccount } from "../../../src/data/accountProvisioning";
import { updateLinkedAccountCredentials } from "../../../src/data/accountManagement";
import { isR2Configured, uploadParticipantPhoto } from "../../../src/data/r2Repository";

const PARENTESCO_OPTIONS = [
  "Padre",
  "Madre",
  "Padrastro",
  "Madrastra",
  "Tutor/a legal",
  "Apoderado/a (sin parentesco biológico)",
];

const PARENTESCO_FIELDS = new Set(["parentesco", "parentesco_apoderado", "contacto_emergencia_parentesco"]);

const emptyDraft: ParticipantDraft = {
  name: "",
  templateId: "",
  status: "activo",
  baseData: {},
  planId: "",
  salonIds: [],
  linkedUid: "",
  accountEmail: "",
  photoUrl: "",
};

export default function ParticipantsScreen() {
  const { membership } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<Person[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonSearch, setSalonSearch] = useState("");
  const [plans, setPlans] = useState<EconomicPlan[]>([]);
  const [planSearch, setPlanSearch] = useState("");
  const [draft, setDraft] = useState<ParticipantDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingAccount, setUpdatingAccount] = useState(false);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenParticipants(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenPlans(membership.organizationId, setPlans);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    (async () => {
      const orgSnap = await getDoc(doc(db, "organizations", membership.organizationId));
      if (!orgSnap.exists()) return;
      const org = orgSnap.data() as Organization;
      const templateSnap = await getDoc(doc(db, "templates", org.templateId));
      if (templateSnap.exists()) {
        setTemplate({ id: templateSnap.id, ...templateSnap.data() } as Template);
      }
    })();
  }, [membership?.organizationId]);

  const title = useMemo(() => (editingId ? "Editar participante" : "Nuevo participante"), [editingId]);
  const needsAccount = !draft.linkedUid;
  const accountEmailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const newEmailInvalid = newEmail.trim().length > 0 && !isValidEmail(newEmail);

  const reset = () => {
    setDraft(emptyDraft);
    setEmail("");
    setPassword("");
    setNewEmail("");
    setNewPassword("");
    setEditingId(null);
  };

  const setBaseField = (fieldId: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, baseData: { ...prev.baseData, [fieldId]: value } }));
  };

  const selectedSalonIds = useMemo(() => new Set(draft.salonIds ?? []), [draft.salonIds]);

  const salonSearchResults = useMemo(() => {
    const term = salonSearch.trim().toLowerCase();
    if (!term) return [];
    return salons
      .filter((s) => !selectedSalonIds.has(s.id) && s.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [salons, salonSearch, selectedSalonIds]);

  const addSalon = (salon: Salon) => {
    setDraft((prev) => ({ ...prev, salonIds: [...(prev.salonIds ?? []), salon.id] }));
    setSalonSearch("");
  };

  const removeSalonFromDraft = (salonId: string) => {
    setDraft((prev) => ({ ...prev, salonIds: (prev.salonIds ?? []).filter((id) => id !== salonId) }));
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permiso requerido", "Necesitamos acceso a tu biblioteca de fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const tempId = editingId ?? `temp_${Date.now()}`;
      const url = await uploadParticipantPhoto(uri, tempId);
      setDraft((prev) => ({ ...prev, photoUrl: url }));
    } catch (e: any) {
      showAlert("Error al subir foto", e?.message ?? "Intenta de nuevo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const selectedPlan = useMemo(() => plans.find((p) => p.id === draft.planId), [plans, draft.planId]);

  const planSearchResults = useMemo(() => {
    const term = planSearch.trim().toLowerCase();
    if (!term) return [];
    return plans.filter((p) => p.id !== draft.planId && p.name.toLowerCase().includes(term)).slice(0, 6);
  }, [plans, planSearch, draft.planId]);

  const selectPlan = (plan: EconomicPlan) => {
    setDraft((prev) => ({ ...prev, planId: plan.id }));
    setPlanSearch("");
  };

  const removePlanFromDraft = () => {
    setDraft((prev) => ({ ...prev, planId: "" }));
  };

  const handleUpdateAccount = async () => {
    if (!membership?.organizationId || !draft.linkedUid) return;
    if (!newEmail.trim() && !newPassword) {
      showAlert("Sin cambios", "Ingresa un nuevo correo y/o contraseña.");
      return;
    }
    if (newEmail.trim() && !isValidEmail(newEmail)) {
      showAlert("Correo inválido", "Ingresa un correo con formato válido.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showAlert("Contraseña muy corta", "Debe tener al menos 6 caracteres.");
      return;
    }
    setUpdatingAccount(true);
    try {
      await updateLinkedAccountCredentials({
        organizationId: membership.organizationId,
        targetUid: draft.linkedUid,
        email: newEmail.trim() || undefined,
        password: newPassword || undefined,
      });
      if (newEmail.trim()) {
        await updateParticipantAccountEmail(membership.organizationId, editingId!, newEmail.trim());
        setDraft((prev) => ({ ...prev, accountEmail: newEmail.trim() }));
      }
      setNewEmail("");
      setNewPassword("");
      showAlert("Listo", "El acceso fue actualizado.");
    } catch (e: any) {
      showAlert("No se pudo actualizar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setUpdatingAccount(false);
    }
  };

  const parseBaseData = () => {
    return draft.baseData ?? {};
  };

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!draft.name.trim()) {
      showAlert("Faltan datos", "Completa el nombre completo.");
      return;
    }

    const baseData = parseBaseData();

    let linkedUid = draft.linkedUid;

    if (needsAccount && (email.trim() || password)) {
      if (!email.trim() || password.length < 6) {
        showAlert(
          "Acceso al sistema",
          "Ingresa un correo válido y una contraseña de al menos 6 caracteres para crear su acceso."
        );
        return;
      }

      if (!isValidEmail(email)) {
        showAlert("Correo inválido", "Ingresa un correo con formato válido para el acceso.");
        return;
      }

      setSaving(true);
      try {
        linkedUid = await provisionLinkedAccount({
          email: email.trim(),
          password,
          displayName: draft.name.trim(),
          organizationId: membership.organizationId,
          role: "lector",
        });
      } catch (e: any) {
        showAlert("No se pudo crear el acceso", mensajeDeErrorAuth(e?.code));
        setSaving(false);
        return;
      }
    }

    setSaving(true);
    try {
      await saveParticipant(
        membership.organizationId,
        {
          ...draft,
          templateId: template?.id ?? draft.templateId,
          baseData,
          linkedUid,
          accountEmail: draft.accountEmail || email.trim() || undefined,
        },
        editingId ?? undefined
      );
      reset();
      showSnackbar("Guardado exitosamente");
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Person) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      templateId: item.templateId,
      status: item.status,
      baseData: item.baseData,
      planId: item.planId ?? "",
      salonIds: item.salonIds ?? [],
      linkedUid: item.linkedUid ?? "",
      accountEmail: item.accountEmail ?? "",
      photoUrl: item.photoUrl ?? "",
    });
    setEmail("");
    setPassword("");
    setNewEmail("");
    setNewPassword("");
  };

  const handleDelete = async (participantId: string) => {
    if (!membership?.organizationId) return;
    await removeParticipant(membership.organizationId, participantId);
    if (editingId === participantId) reset();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Participantes" }]} />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{title}</Text>

        {isR2Configured() ? (
          <View style={styles.photoRow}>
            {draft.photoUrl ? (
              <Image source={{ uri: draft.photoUrl }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>Sin foto</Text>
              </View>
            )}
            <Pressable onPress={handlePickPhoto} style={styles.photoButton} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.teal} />
                : <Text style={styles.photoButtonText}>{draft.photoUrl ? "Cambiar foto" : "Subir foto"}</Text>}
            </Pressable>
          </View>
        ) : null}

        <TextInput value={draft.name} onChangeText={(value) => setDraft({ ...draft, name: value })} placeholder="Nombre completo" style={styles.input} />

        <Text style={styles.fieldLabel}>Plan</Text>
        {!selectedPlan ? (
          <>
            <TextInput
              value={planSearch}
              onChangeText={setPlanSearch}
              placeholder="Buscar plan"
              style={styles.input}
            />
            {planSearch.trim() ? (
              planSearchResults.length > 0 ? (
                <View style={styles.searchResults}>
                  {planSearchResults.map((plan) => (
                    <Pressable key={plan.id} style={styles.searchResultRow} onPress={() => selectPlan(plan)}>
                      <Text style={styles.searchResultText}>{plan.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.searchEmpty}>Sin resultados.</Text>
              )
            ) : null}
          </>
        ) : (
          <View style={styles.chipRow}>
            <View style={styles.salonChip}>
              <Text style={styles.salonChipText} numberOfLines={1}>{selectedPlan.name}</Text>
              <Pressable onPress={removePlanFromDraft} hitSlop={6}>
                <Text style={styles.salonChipRemove}>×</Text>
              </Pressable>
            </View>
          </View>
        )}

        <Text style={styles.fieldLabel}>Salones</Text>
        <TextInput
          value={salonSearch}
          onChangeText={setSalonSearch}
          placeholder="Buscar salón"
          style={styles.input}
        />
        {salonSearch.trim() ? (
          salonSearchResults.length > 0 ? (
            <View style={styles.searchResults}>
              {salonSearchResults.map((salon) => (
                <Pressable key={salon.id} style={styles.searchResultRow} onPress={() => addSalon(salon)}>
                  <Text style={styles.searchResultText}>{salon.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.searchEmpty}>Sin resultados.</Text>
          )
        ) : null}
        {draft.salonIds && draft.salonIds.length > 0 ? (
          <View style={styles.chipRow}>
            {draft.salonIds.map((id) => {
              const salon = salons.find((s) => s.id === id);
              return (
                <View key={id} style={styles.salonChip}>
                  <Text style={styles.salonChipText} numberOfLines={1}>{salon?.name ?? id}</Text>
                  <Pressable onPress={() => removeSalonFromDraft(id)} hitSlop={6}>
                    <Text style={styles.salonChipRemove}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}

        {template ? (
          template.baseSections.map((section) => (
            <View key={section.id} style={styles.fichaSection}>
              <Text style={styles.fichaSectionTitle}>{section.title}</Text>
              {section.fields.map((field) =>
                PARENTESCO_FIELDS.has(field.id) ? (
                  <DropdownSelect
                    key={field.id}
                    value={draft.baseData[field.id] !== undefined ? String(draft.baseData[field.id]) : undefined}
                    options={PARENTESCO_OPTIONS}
                    onChange={(value) => setBaseField(field.id, value)}
                    placeholder="Seleccionar parentesco"
                  />
                ) : (
                  <FieldInput
                    key={field.id}
                    field={field}
                    value={draft.baseData[field.id] as string | number | undefined}
                    onChange={(value) => setBaseField(field.id, value)}
                  />
                )
              )}
            </View>
          ))
        ) : (
          <Text style={styles.listBody}>Cargando ficha de la organización…</Text>
        )}

        <View style={styles.roleRow}>
          {(["activo", "inactivo"] as const).map((status) => (
            <Pressable key={status} onPress={() => setDraft({ ...draft, status })} style={[styles.roleChip, draft.status === status && styles.roleChipActive]}>
              <Text style={[styles.roleText, draft.status === status && styles.roleTextActive]}>{status}</Text>
            </Pressable>
          ))}
        </View>

        {needsAccount ? (
          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>Acceso al sistema (opcional)</Text>
            <Text style={styles.accountNote}>
              Si completas correo y contraseña, esta persona (o su apoderado) podrá iniciar sesión en modo solo lectura para ver sus avances.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, accountEmailInvalid && styles.inputError]}
            />
            {accountEmailInvalid ? <Text style={styles.errorText}>Correo inválido</Text> : null}
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña (mínimo 6 caracteres)"
              secureTextEntry
              style={styles.input}
            />
          </View>
        ) : (
          <View style={styles.accountBox}>
            <Text style={styles.accountLinked}>Acceso al sistema vinculado · {draft.accountEmail || "correo no registrado"}</Text>
            <Text style={styles.accountLabel}>Cambiar correo / contraseña</Text>
            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Nuevo correo (opcional)"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, newEmailInvalid && styles.inputError]}
            />
            {newEmailInvalid ? <Text style={styles.errorText}>Correo inválido</Text> : null}
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña (opcional)"
              secureTextEntry
              style={styles.input}
            />
            <Pressable
              onPress={handleUpdateAccount}
              disabled={updatingAccount}
              style={[styles.secondaryButton, updatingAccount && styles.primaryButtonDisabled]}
            >
              {updatingAccount ? <ActivityIndicator color={colors.teal} /> : <Text style={styles.secondaryButtonText}>Actualizar acceso</Text>}
            </Pressable>
          </View>
        )}
        <Pressable onPress={handleSave} disabled={saving} style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar participante</Text>}
        </Pressable>
        <Pressable onPress={reset} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Limpiar</Text></Pressable>
      </View>

      {items.map((item) => (
        <View key={item.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{item.name}</Text>
          <Text style={styles.listBody}>Template: {item.templateId} · {item.status} {item.planId ? `· plan ${plans.find((p) => p.id === item.planId)?.name ?? item.planId}` : ""}</Text>
          <Text style={styles.listBody}>
            Salones: {item.salonIds?.length ? item.salonIds.map((id) => salons.find((s) => s.id === id)?.name ?? id).join(", ") : "ninguno"}
          </Text>
          <Text style={styles.listBody}>{item.linkedUid ? `Acceso al sistema creado · ${item.accountEmail || "correo no registrado"}` : "Sin acceso creado"}</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => startEdit(item)}><Text style={styles.actionLink}>Editar</Text></Pressable>
            <Pressable onPress={() => handleDelete(item.id)}><Text style={styles.actionDanger}>Eliminar</Text></Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function mensajeDeErrorAuth(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo.";
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil.";
    default:
      return "No se pudo crear la cuenta. Intenta de nuevo.";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  photoPreview: { width: 72, height: 72, borderRadius: 36 },
  photoPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  photoPlaceholderText: { fontSize: 11, color: colors.slate },
  photoButton: { borderWidth: 1, borderColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, minWidth: 100, alignItems: "center" },
  photoButtonText: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  fichaSection: { marginBottom: spacing.md },
  fichaSectionTitle: { fontSize: 12, fontWeight: "700", color: colors.tealDark, textTransform: "uppercase", marginBottom: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  inputError: { borderColor: colors.danger, marginBottom: 0 },
  errorText: { fontSize: 11, color: colors.danger, marginBottom: spacing.sm },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  searchResults: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  searchResultRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  searchResultText: { fontSize: 13, color: colors.ink },
  searchEmpty: { fontSize: 12, color: colors.slate, marginTop: -spacing.xs, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  salonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    maxWidth: 200,
  },
  salonChipText: { fontSize: 12, color: colors.tealDark, fontWeight: "600" },
  salonChipRemove: { fontSize: 14, color: colors.tealDark, fontWeight: "700" },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  roleChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.paper },
  roleChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  roleText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  roleTextActive: { color: colors.tealDark },
  primaryButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.xs },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center", marginTop: spacing.sm },
  secondaryButtonText: { color: colors.ink, fontWeight: "600" },
  accountBox: { backgroundColor: colors.tealTint, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  accountLabel: { fontSize: 12, fontWeight: "700", color: colors.tealDark, marginBottom: 4 },
  accountNote: { fontSize: 11, color: colors.slate, marginBottom: spacing.sm, lineHeight: 16 },
  accountLinked: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  primaryButtonDisabled: { opacity: 0.6 },
  listCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  listBody: { fontSize: 12, color: colors.slate, marginTop: spacing.xs, lineHeight: 18 },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.teal, fontWeight: "700" },
  actionDanger: { color: colors.danger, fontWeight: "700" },
});