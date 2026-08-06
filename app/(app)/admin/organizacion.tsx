import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { showAlert } from "../../../src/utils/alert";
import { isValidEmail } from "../../../src/utils/email";
import { useSnackbar } from "../../../src/context/SnackbarContext";
import Breadcrumb from "../../../src/components/Breadcrumb";
import DropdownSelect from "../../../src/components/DropdownSelect";
import { updateOrganizationBranding } from "../../../src/data/organizationSetup";
import { CHILE_REGIONS_COMMUNES } from "../../../src/data/chileRegionsCommunes";
import { isR2Configured, uploadOrganizationPhoto } from "../../../src/data/r2Repository";

export default function OrganizacionScreen() {
  const { membership, organization } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [comuna, setComuna] = useState("");
  const [region, setRegion] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const emailInvalid = email.trim().length > 0 && !isValidEmail(email);
  const regionOptions = CHILE_REGIONS_COMMUNES.map((item) => item.region);
  const comunaOptions = CHILE_REGIONS_COMMUNES.find((item) => item.region === region)?.communes ?? [];

  useEffect(() => {
    setName(organization?.name ?? "");
    setLogoUrl(organization?.logoUrl ?? "");
    setAddressStreet(organization?.addressStreet ?? "");
    setComuna(organization?.comuna ?? "");
    setRegion(organization?.region ?? "");
    setPhone(organization?.phone ?? "");
    setEmail(organization?.email ?? "");
  }, [organization]);

  useEffect(() => {
    if (!comuna) return;
    if (!comunaOptions.includes(comuna)) {
      setComuna("");
    }
  }, [comuna, comunaOptions]);

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!name.trim()) {
      showAlert("Faltan datos", "Ingresa el nombre de la organización.");
      return;
    }
    if (!region.trim()) {
      showAlert("Faltan datos", "Selecciona una región.");
      return;
    }
    if (!comuna.trim()) {
      showAlert("Faltan datos", "Selecciona una comuna.");
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      showAlert("Correo inválido", "Ingresa un correo con formato válido.");
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationBranding(membership.organizationId, {
        name: name.trim(),
        logoUrl: logoUrl.trim(),
        addressStreet: addressStreet.trim(),
        comuna: comuna.trim(),
        region: region.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      showSnackbar("Guardado exitosamente");
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!membership?.organizationId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert("Permiso requerido", "Necesitamos acceso a tu biblioteca de fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const uri = result.assets[0].uri;
      const url = await uploadOrganizationPhoto(uri, membership.organizationId);
      setLogoUrl(url);
      showSnackbar("Imagen subida");
    } catch (e: any) {
      showAlert("Error al subir foto", e?.message ?? "Intenta de nuevo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Organización" }]} />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Datos de la organización</Text>
        <Text style={styles.hint}>Se muestran en la parte superior de todas las pantallas de la app.</Text>

        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Nombre de la organización" style={styles.input} />

        {isR2Configured() ? (
          <View style={styles.photoRow}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.photoPreview} />
            ) : (
              <View style={[styles.photoPreview, styles.photoPlaceholder]}>
                <Text style={styles.photoPlaceholderText}>Sin imagen</Text>
              </View>
            )}
            <Pressable onPress={handlePickPhoto} style={styles.photoButton} disabled={uploadingPhoto}>
              {uploadingPhoto
                ? <ActivityIndicator size="small" color={colors.teal} />
                : <Text style={styles.photoButtonText}>{logoUrl ? "Cambiar imagen" : "Subir imagen"}</Text>}
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Dirección</Text>
        <TextInput value={addressStreet} onChangeText={setAddressStreet} placeholder="Calle y número" style={styles.input} />

        <Text style={styles.fieldLabel}>Región</Text>
        <DropdownSelect
          value={region}
          options={regionOptions}
          onChange={(value) => {
            setRegion(value);
          }}
          placeholder="Seleccionar región"
        />

        <Text style={styles.fieldLabel}>Comuna</Text>
        <DropdownSelect
          value={comuna}
          options={comunaOptions}
          onChange={setComuna}
          placeholder={region ? "Seleccionar comuna" : "Primero selecciona región"}
        />

        <Text style={styles.fieldLabel}>Teléfono</Text>
        <TextInput value={phone} onChangeText={setPhone} placeholder="Teléfono" keyboardType="phone-pad" style={styles.input} />

        <Text style={styles.fieldLabel}>Correo</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="correo@organizacion.cl"
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, emailInvalid && styles.inputError]}
        />
        {emailInvalid ? <Text style={styles.errorText}>Correo inválido</Text> : null}

        <Pressable onPress={handleSave} disabled={saving} style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  hint: { fontSize: 12, color: colors.slate, marginTop: spacing.xs, marginBottom: spacing.md },
  fieldLabel: { fontSize: 12, color: colors.slate, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  photoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  photoPreview: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.line },
  photoPlaceholder: { backgroundColor: colors.paper, justifyContent: "center", alignItems: "center" },
  photoPlaceholderText: { color: colors.slate, fontSize: 11, fontWeight: "600" },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#fff",
  },
  photoButtonText: { color: colors.teal, fontWeight: "700", fontSize: 13 },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
