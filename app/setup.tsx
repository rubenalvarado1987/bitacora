import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect, useRouter } from "expo-router";
import { businessCategories, getBusinessCategory } from "../src/data/businessCatalog";
import { createOrganizationFromWizard } from "../src/data/organizationSetup";
import { useAuth } from "../src/context/AuthContext";
import { firebaseConfigError } from "../src/firebase";
import LoadingScreen from "../src/components/LoadingScreen";
import { colors, radius, spacing } from "../src/theme";

export default function SetupScreen() {
  const { user, membership, loading, refreshMembership } = useAuth();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(businessCategories[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(() => getBusinessCategory(selectedCategoryId), [selectedCategoryId]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (membership) {
    return <Redirect href="/" />;
  }

  const handleContinue = async () => {
    if (firebaseConfigError) {
      setError(firebaseConfigError);
      return;
    }

    if (!organizationName.trim()) {
      setError("Ingresa un nombre para la organización.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { organizationId } = await createOrganizationFromWizard({
        organizationName,
        categoryId: selectedCategoryId,
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      });
      // Pasa el orgId para evitar collectionGroup y permisos insuficientes al inicio
      await refreshMembership(organizationId);
      router.replace("/");
    } catch (e) {
      console.warn("No se pudo crear la organización:", e);
      setError("No se pudo completar el wizard. Revisa Firebase y vuelve a intentarlo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Configuración inicial</Text>
        <Text style={styles.title}>Elige la categoría de negocio para crear la primera organización.</Text>
        <Text style={styles.subtitle}>
          El primer usuario queda como Admin y define la plantilla base que se usará para continuar.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Nombre de la organización</Text>
        <TextInput
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Ej.: Jardín Los Pinitos"
          placeholderTextColor={colors.slate}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Categoría de negocio</Text>
        <View style={styles.categoryGrid}>
          {businessCategories.map((category) => {
            const active = category.id === selectedCategoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={({ pressed }) => [
                  styles.categoryCard,
                  active && styles.categoryCardActive,
                  pressed && styles.categoryCardPressed,
                ]}
              >
                <Text style={styles.categoryLabel}>{category.label}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Módulos sugeridos</Text>
          <Text style={styles.previewBody}>{selectedCategory.modules.join(" · ")}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleContinue}
          disabled={submitting || !organizationName.trim() || !!firebaseConfigError}
          style={({ pressed }) => [
            styles.button,
            (submitting || !organizationName.trim() || !!firebaseConfigError) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear organización</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...Platform.select({ web: { boxShadow: "0 8px 30px rgba(0,0,0,0.05)" } }),
  },
  kicker: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.teal },
  title: { fontSize: 26, lineHeight: 32, fontWeight: "700", color: colors.ink, marginTop: spacing.xs },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: spacing.sm, lineHeight: 19 },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  label: { fontSize: 12, color: colors.slate, fontWeight: "600", marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
  },
  categoryGrid: { gap: spacing.sm },
  categoryCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.paper,
  },
  categoryCardActive: { borderColor: colors.teal, backgroundColor: colors.tealTint },
  categoryCardPressed: { opacity: 0.9 },
  categoryLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  categoryDescription: { fontSize: 12, color: colors.slate, marginTop: 4, lineHeight: 18 },
  previewCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  previewTitle: { fontSize: 12, fontWeight: "700", color: colors.tealDark, marginBottom: spacing.xs },
  previewBody: { fontSize: 12, color: colors.slate, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.md },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});