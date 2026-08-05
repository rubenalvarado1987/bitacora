import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { showAlert } from "../../../src/utils/alert";
import Breadcrumb from "../../../src/components/Breadcrumb";
import DateField from "../../../src/components/DateField";
import DropdownSelect from "../../../src/components/DropdownSelect";
import { useSnackbar } from "../../../src/context/SnackbarContext";
import { ProfileRecord, Salon } from "../../../src/types";
import {
  ProfileDraft,
  listenProfiles,
  listenSalons,
  removeProfile,
  saveProfile,
  updateProfileAccountEmail,
} from "../../../src/data/adminRepository";
import { provisionLinkedAccount } from "../../../src/data/accountProvisioning";
import { updateLinkedAccountCredentials } from "../../../src/data/accountManagement";
import { formatRut, isValidRut } from "../../../src/utils/rut";
import { isValidEmail } from "../../../src/utils/email";
import { isR2Configured, uploadProfilePhoto } from "../../../src/data/r2Repository";

const RELATIONSHIP_OPTIONS = [
  { value: "Padre", label: "Padre" },
  { value: "Madre", label: "Madre" },
  { value: "Padrastro", label: "Padrastro" },
  { value: "Madrastra", label: "Madrastra" },
  { value: "Tutor/a legal", label: "Tutor/a legal" },
  { value: "Apoderado/a (sin parentesco biológico)", label: "Apoderado/a (sin parentesco biológico)" },
  { value: "Pareja", label: "Pareja" },
  { value: "Cónyuge", label: "Cónyuge" },
  { value: "Abuela", label: "Abuela" },
  { value: "Abuelo", label: "Abuelo" },
] as const;

const emptyDraft: ProfileDraft = {
  displayName: "",
  username: "",
  role: "editor",
  active: true,
  linkedUid: "",
  accountEmail: "",
  nationality: "",
  birthDate: "",
  idNumber: "",
  addressStreet: "",
  comuna: "",
  phone: "",
  personalEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  salonIds: [],
  position: "",
  photoUrl: "",
};

export default function AdminProfilesScreen() {
  const { membership } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<ProfileRecord[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonSearch, setSalonSearch] = useState("");
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
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
    return listenProfiles(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  const title = useMemo(() => (editingId ? "Editar perfil" : "Nuevo perfil"), [editingId]);
  const needsAccount = !draft.linkedUid;
  const rutInvalid = (draft.idNumber ?? "").trim().length > 0 && !isValidRut(draft.idNumber ?? "");
  const personalEmailInvalid = (draft.personalEmail ?? "").trim().length > 0 && !isValidEmail(draft.personalEmail ?? "");
  const accountEmailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const newEmailInvalid = newEmail.trim().length > 0 && !isValidEmail(newEmail);

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
      const url = await uploadProfilePhoto(uri, tempId);
      setDraft((prev) => ({ ...prev, photoUrl: url }));
    } catch (e: any) {
      showAlert("Error al subir foto", e?.message ?? "Intenta de nuevo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const reset = () => {
    setDraft(emptyDraft);
    setEmail("");
    setPassword("");
    setNewEmail("");
    setNewPassword("");
    setEditingId(null);
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
        await updateProfileAccountEmail(membership.organizationId, editingId!, newEmail.trim());
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

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!draft.displayName.trim() || !draft.username.trim()) {
      showAlert("Faltan datos", "Completa nombre y usuario.");
      return;
    }

    let linkedUid = draft.linkedUid;

    if (needsAccount && (!email.trim() || password.length < 6)) {
      showAlert(
        "Acceso del profesional",
        "Ingresa un correo válido y una contraseña de al menos 6 caracteres para crear su acceso."
      );
      return;
    }

    if (needsAccount && !isValidEmail(email)) {
      showAlert("Correo inválido", "Ingresa un correo con formato válido para el acceso del profesional.");
      return;
    }

    if ((draft.personalEmail ?? "").trim() && !isValidEmail(draft.personalEmail ?? "")) {
      showAlert("Correo inválido", "Ingresa un correo personal con formato válido.");
      return;
    }

    setSaving(true);

    if (needsAccount) {
      try {
        linkedUid = await provisionLinkedAccount({
          email: email.trim(),
          password,
          displayName: draft.displayName.trim(),
          organizationId: membership.organizationId,
          role: draft.role,
        });
      } catch (e: any) {
        showAlert("No se pudo crear el acceso", mensajeDeErrorAuth(e?.code));
        setSaving(false);
        return;
      }
    }

    try {
      await saveProfile(membership.organizationId, { ...draft, linkedUid, accountEmail: draft.accountEmail || email.trim() || undefined }, editingId ?? undefined);
      reset();
      showSnackbar("Guardado exitosamente");
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (profile: ProfileRecord) => {
    setEditingId(profile.id);
    setDraft({
      displayName: profile.displayName,
      username: profile.username,
      role: profile.role,
      active: profile.active,
      linkedUid: profile.linkedUid ?? "",
      accountEmail: profile.accountEmail ?? "",
      nationality: profile.nationality ?? "",
      birthDate: profile.birthDate ?? "",
      idNumber: profile.idNumber ?? "",
      addressStreet: profile.addressStreet ?? "",
      comuna: profile.comuna ?? "",
      phone: profile.phone ?? "",
      personalEmail: profile.personalEmail ?? "",
      emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? "",
      emergencyContactRelationship: profile.emergencyContactRelationship ?? "",
      salonIds: profile.salonIds ?? [],
      position: profile.position ?? "",
      photoUrl: profile.photoUrl ?? "",
    });
    setEmail("");
    setPassword("");
    setNewEmail("");
    setNewPassword("");
  };

  const handleDelete = async (profileId: string) => {
    if (!membership?.organizationId) return;
    await removeProfile(membership.organizationId, profileId);
    if (editingId === profileId) {
      reset();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Perfiles" }]} />
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

        <TextInput value={draft.displayName} onChangeText={(value) => setDraft({ ...draft, displayName: value })} placeholder="Nombre Completo" style={styles.input} />
        <TextInput value={draft.username} onChangeText={(value) => setDraft({ ...draft, username: value })} placeholder="Usuario" style={styles.input} />
        <TextInput value={draft.position ?? ""} onChangeText={(value) => setDraft({ ...draft, position: value })} placeholder="Cargo (opcional)" style={styles.input} />
        <TextInput value={draft.nationality ?? ""} onChangeText={(value) => setDraft({ ...draft, nationality: value })} placeholder="Nacionalidad" style={styles.input} />

        <Text style={styles.fieldLabel}>Fecha de nacimiento</Text>
        <DateField value={draft.birthDate ?? ""} onChange={(iso) => setDraft({ ...draft, birthDate: iso })} placeholder="Seleccionar fecha de nacimiento" />

        <TextInput
          value={draft.idNumber ?? ""}
          onChangeText={(value) => setDraft({ ...draft, idNumber: formatRut(value) })}
          placeholder="RUT"
          autoCapitalize="characters"
          style={[styles.input, rutInvalid && styles.inputError]}
        />
        {rutInvalid ? <Text style={styles.errorText}>RUT inválido</Text> : null}
        <TextInput value={draft.addressStreet ?? ""} onChangeText={(value) => setDraft({ ...draft, addressStreet: value })} placeholder="Dirección (calle)" style={styles.input} />
        <TextInput value={draft.comuna ?? ""} onChangeText={(value) => setDraft({ ...draft, comuna: value })} placeholder="Comuna" style={styles.input} />
        <TextInput value={draft.phone ?? ""} onChangeText={(value) => setDraft({ ...draft, phone: value })} placeholder="Teléfono" keyboardType="phone-pad" style={styles.input} />
        <TextInput
          value={draft.personalEmail ?? ""}
          onChangeText={(value) => setDraft({ ...draft, personalEmail: value })}
          placeholder="Correo personal"
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, personalEmailInvalid && styles.inputError]}
        />
        {personalEmailInvalid ? <Text style={styles.errorText}>Correo inválido</Text> : null}

        <Text style={styles.fieldLabel}>Contacto de emergencia</Text>
        <TextInput value={draft.emergencyContactName ?? ""} onChangeText={(value) => setDraft({ ...draft, emergencyContactName: value })} placeholder="Nombre del contacto" style={styles.input} />
        <TextInput value={draft.emergencyContactPhone ?? ""} onChangeText={(value) => setDraft({ ...draft, emergencyContactPhone: value })} placeholder="Teléfono del contacto" keyboardType="phone-pad" style={styles.input} />
        <DropdownSelect
          value={draft.emergencyContactRelationship ?? ""}
          options={RELATIONSHIP_OPTIONS.map((o) => o.label)}
          onChange={(label) => {
            const option = RELATIONSHIP_OPTIONS.find((o) => o.label === label);
            setDraft({ ...draft, emergencyContactRelationship: option?.value ?? "" });
          }}
          placeholder="Seleccionar parentesco"
        />

        <View style={styles.roleRow}>
          {(["editor", "lector", "admin"] as const).map((role) => (
            <Pressable key={role} onPress={() => setDraft({ ...draft, role })} style={[styles.roleChip, draft.role === role && styles.roleChipActive]}>
              <Text style={[styles.roleText, draft.role === role && styles.roleTextActive]}>{role}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.roleRow}>
          {([true, false] as const).map((active) => (
            <Pressable key={String(active)} onPress={() => setDraft({ ...draft, active })} style={[styles.roleChip, draft.active === active && styles.roleChipActive]}>
              <Text style={[styles.roleText, draft.active === active && styles.roleTextActive]}>{active ? "Activo" : "Inactivo"}</Text>
            </Pressable>
          ))}
        </View>

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

        {needsAccount ? (
          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>Acceso del profesional</Text>
            <Text style={styles.accountNote}>
              Crea el correo y la contraseña con los que este profesional iniciará sesión y editará fichas.
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
            <Text style={styles.accountLinked}>Cuenta vinculada · {draft.accountEmail || "correo no registrado"}</Text>
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
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar perfil</Text>}
        </Pressable>
        <Pressable onPress={reset} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Limpiar</Text>
        </Pressable>
      </View>

      {items.map((item) => (
        <View key={item.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{item.displayName}</Text>
          <Text style={styles.listBody}>@{item.username} · {item.role}{item.position ? ` · ${item.position}` : ""} · {item.active ? "Activo" : "Inactivo"}</Text>
          <Text style={styles.listBody}>{item.linkedUid ? `Cuenta vinculada · ${item.accountEmail || "correo no registrado"}` : "Sin acceso creado"}</Text>
          <Text style={styles.listBody}>
            Salones: {item.salonIds?.length ? item.salonIds.map((id) => salons.find((s) => s.id === id)?.name ?? id).join(", ") : "ninguno"}
          </Text>
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
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.slate, marginBottom: spacing.xs, marginTop: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  inputError: { borderColor: colors.danger, marginBottom: 0 },
  errorText: { fontSize: 11, color: colors.danger, marginBottom: spacing.sm },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  roleChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.paper },
  roleChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  roleText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  roleTextActive: { color: colors.tealDark },
  searchResults: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, marginBottom: spacing.sm, overflow: "hidden" },
  searchResultRow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  searchResultText: { fontSize: 13, color: colors.ink },
  searchEmpty: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  salonChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.tealTint, borderWidth: 1, borderColor: colors.teal, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 220 },
  salonChipText: { fontSize: 12, color: colors.tealDark, fontWeight: "600" },
  salonChipRemove: { fontSize: 14, color: colors.tealDark, fontWeight: "700" },
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
  listBody: { fontSize: 12, color: colors.slate, marginTop: spacing.xs },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.teal, fontWeight: "700" },
  actionDanger: { color: colors.danger, fontWeight: "700" },
});