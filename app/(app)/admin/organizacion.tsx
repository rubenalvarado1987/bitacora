import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../src/theme";
import { showAlert } from "../../../src/utils/alert";
import { useSnackbar } from "../../../src/context/SnackbarContext";
import Breadcrumb from "../../../src/components/Breadcrumb";
import { updateOrganizationBranding } from "../../../src/data/organizationSetup";

export default function OrganizacionScreen() {
  const { membership, organization } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(organization?.name ?? "");
    setLogoUrl(organization?.logoUrl ?? "");
  }, [organization]);

  const handleSave = async () => {
    if (!membership?.organizationId) return;
    if (!name.trim()) {
      showAlert("Faltan datos", "Ingresa el nombre del jardín.");
      return;
    }
    setSaving(true);
    try {
      await updateOrganizationBranding(membership.organizationId, { name: name.trim(), logoUrl: logoUrl.trim() });
      showSnackbar("Guardado exitosamente");
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Organización" }]} />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Nombre y logo del jardín</Text>
        <Text style={styles.hint}>Se muestran en la parte superior de todas las pantallas de la app.</Text>

        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Nombre del jardín" style={styles.input} />

        <Text style={styles.fieldLabel}>URL del logo (opcional)</Text>
        <TextInput
          value={logoUrl}
          onChangeText={setLogoUrl}
          placeholder="https://..."
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
        />

        {logoUrl ? (
          <View style={styles.previewRow}>
            <Image source={{ uri: logoUrl }} style={styles.preview} />
            <Text style={styles.hint}>Vista previa</Text>
          </View>
        ) : null}

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
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  preview: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
