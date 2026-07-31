import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../src/firebase";
import { useAuth } from "../../src/context/AuthContext";
import { Organization, Template, TemplateField, FieldType } from "../../src/types";
import { colors, radius, spacing } from "../../src/theme";
import { showAlert } from "../../src/utils/alert";

const TIPOS: FieldType[] = ["text", "number", "date", "time", "select", "scale", "checklist", "photo", "signature"];

export default function PlantillaScreen() {
  const { membership } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  const [seccionDestino, setSeccionDestino] = useState<string | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) return;
    (async () => {
      const orgSnap = await getDoc(doc(db, "organizations", membership.organizationId));
      if (orgSnap.exists()) {
        const org = orgSnap.data() as Organization;
        const templateSnap = await getDoc(doc(db, "templates", org.templateId));
        if (templateSnap.exists()) {
          setTemplate({ id: templateSnap.id, ...templateSnap.data() } as Template);
        }
      }
      setLoading(false);
    })();
  }, [membership?.organizationId]);

  const agregarCampo = (seccionId: string) => {
    if (!nuevaEtiqueta.trim() || !template) return;
    const nuevoCampo: TemplateField = {
      id: `${seccionId}-${Date.now()}`,
      label: nuevaEtiqueta.trim(),
      type: "text",
    };
    setTemplate({
      ...template,
      entrySections: template.entrySections.map((s) =>
        s.id === seccionId ? { ...s, fields: [...s.fields, nuevoCampo] } : s
      ),
    });
    setNuevaEtiqueta("");
    setSeccionDestino(null);
  };

  const guardar = async () => {
    if (!template) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "templates", template.id), { ...template, version: template.version + 1 });
      showAlert("Guardado", "La plantilla se actualizó correctamente.");
    } catch (error) {
      console.warn(error);
      showAlert("Error", "No se pudo guardar la plantilla.");
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

  if (membership?.role !== "admin") {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Plantilla" }} />
        <Text style={styles.emptyText}>Solo un administrador de la organización puede editar la plantilla.</Text>
      </View>
    );
  }

  if (!template) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Esta organización todavía no tiene una plantilla activa.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Plantilla · ${template.name}` }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.hint}>
          Esta es la plantilla que ven todos los profesionales de la organización al crear un registro. Los
          campos nuevos se agregan como texto por defecto; ajusta el tipo desde Firestore o desde una futura
          pantalla de detalle de campo.
        </Text>

        {template.entrySections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>

            {section.fields.map((field) => (
              <View key={field.id} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldType}>{field.type}</Text>
              </View>
            ))}

            {seccionDestino === section.id ? (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Nombre del nuevo campo"
                  placeholderTextColor={colors.slate}
                  value={nuevaEtiqueta}
                  onChangeText={setNuevaEtiqueta}
                  autoFocus
                />
                <Pressable style={styles.addConfirm} onPress={() => agregarCampo(section.id)}>
                  <Text style={styles.addConfirmText}>Añadir</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setSeccionDestino(section.id)}>
                <Text style={styles.addLink}>+ Añadir campo a esta sección</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Text style={styles.typesHint}>Tipos de campo disponibles: {TIPOS.join(", ")}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={guardar} disabled={saving} style={[styles.saveButton, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveButtonText}>{saving ? "Guardando..." : "Guardar plantilla"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  hint: { fontSize: 12, color: colors.slate, marginBottom: spacing.lg, lineHeight: 18 },
  sectionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 12, fontWeight: "600", color: colors.tealDark, marginBottom: spacing.sm, textTransform: "uppercase" },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  fieldLabel: { fontSize: 13, color: colors.ink },
  fieldType: { fontSize: 11, color: "#fff", backgroundColor: colors.slate, paddingHorizontal: 8, borderRadius: 6, overflow: "hidden" },
  addLink: { fontSize: 13, color: colors.teal, marginTop: spacing.sm, fontWeight: "600" },
  addRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 13,
  },
  addConfirm: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingHorizontal: spacing.md, justifyContent: "center" },
  addConfirmText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  typesHint: { fontSize: 11, color: colors.slate, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card },
  saveButton: { backgroundColor: colors.teal, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
