import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../../src/firebase";
import { useAuth } from "../../../../src/context/AuthContext";
import { Person, Template } from "../../../../src/types";
import { FieldInput } from "../../../../src/components/SectionField";
import { colors, radius, spacing } from "../../../../src/theme";
import { showAlert } from "../../../../src/utils/alert";

export default function NuevoRegistroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string | number>>({});

  useEffect(() => {
    if (!membership?.organizationId || !id) return;

    (async () => {
      const personSnap = await getDoc(doc(db, "organizations", membership.organizationId, "people", id));
      if (personSnap.exists()) {
        const personData = personSnap.data() as Person;
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

  const handleSave = async () => {
    const seccionPrincipal = template.entrySections[0];
    const camposFaltantes = seccionPrincipal.fields.filter(
      (f) => f.required && (values[f.id] === undefined || values[f.id] === "")
    );

    if (camposFaltantes.length > 0) {
      showAlert("Faltan campos", `Completa: ${camposFaltantes.map((f) => f.label).join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      await addDoc(
        collection(db, "organizations", membership.organizationId, "people", id, "entries"),
        {
          personId: id,
          authorUid: user?.uid,
          authorName: membership.name ?? user?.email ?? "Desconocido",
          type: seccionPrincipal.title,
          values,
          createdAt: serverTimestamp(),
        }
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
      <Stack.Screen options={{ title: "Nuevo registro", presentation: "modal" }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {template.entrySections.map((section) => (
          <View key={section.id} style={{ marginBottom: spacing.lg }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id]}
                onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.saveButtonText}>{saving ? "Guardando..." : "Guardar registro"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: colors.tealDark,
    fontWeight: "600",
    marginBottom: spacing.md,
  },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", padding: spacing.lg },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
