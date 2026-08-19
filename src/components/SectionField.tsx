import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { TemplateField } from "../types";
import { colors, radius, spacing } from "../theme";
import DateField from "./DateField";
import DropdownSelect from "./DropdownSelect";
import AppIcon from "./AppIcon";
import { getFieldIconName } from "../data/fichaIcons";
import { formatRut, isRutField, isValidRut } from "../utils/rut";
import { isEmailField, isValidEmail } from "../utils/email";
import { uploadEntryFile } from "../data/r2Repository";

function analyzeFieldState(field: TemplateField, value: string | number | undefined) {
  const isRut = field.type === "text" && isRutField(field.id || field.label);
  const rutValue = value !== undefined ? String(value) : "";
  const rutInvalid = isRut && rutValue.trim().length > 0 && !isValidRut(rutValue);

  const isEmail = field.type === "text" && !isRut && isEmailField(field.id || field.label);
  const emailValue = value !== undefined ? String(value) : "";
  const emailInvalid = isEmail && emailValue.trim().length > 0 && !isValidEmail(emailValue);

  return { isRut, rutValue, rutInvalid, isEmail, emailValue, emailInvalid };
}

// Fila de solo lectura, usada para mostrar los datos base de una ficha.
export function FieldDisplay({ label, value }: Readonly<{ label: string; value: string | number | boolean | undefined }>) {
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <AppIcon name={getFieldIconName({ id: label, label, type: "text" })} size={16} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.value}>{value === undefined || value === "" ? "—" : String(value)}</Text>
    </View>
  );
}

// ── PhotoPicker ────────────────────────────────────────────────────────────────
function PhotoPicker({
  value,
  onChange,
  accentColor = colors.teal,
  accentTint = colors.tealTint,
}: Readonly<{
  value: string | number | undefined;
  onChange: (v: string) => void;
  accentColor?: string;
  accentTint?: string;
}>) {
  const [uploading, setUploading] = useState(false);
  const url = value ? String(value) : "";
  const isPdf = url.toLowerCase().endsWith(".pdf");

  const pickAndUpload = async (uri: string) => {
    setUploading(true);
    try {
      const publicUrl = await uploadEntryFile(uri);
      onChange(publicUrl);
    } catch (e: any) {
      Alert.alert("Error al subir archivo", e?.message ?? "Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const handlePress = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp,application/pdf";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const blobUri = URL.createObjectURL(file);
        await pickAndUpload(blobUri);
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu biblioteca de fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled) return;
    await pickAndUpload(result.assets[0].uri);
  };

  if (uploading) {
    return (
      <View style={styles.photoUploading}>
        <ActivityIndicator color={colors.teal} size="small" />
        <Text style={styles.photoUploadingText}>Subiendo archivo...</Text>
      </View>
    );
  }

  if (url) {
    if (isPdf) {
      return (
        <View style={styles.pdfCard}>
          <AppIcon name="file-pdf-box" size={22} color={colors.danger} />
          <Text style={styles.pdfName} numberOfLines={1}>Documento PDF adjunto</Text>
          <Pressable onPress={() => Linking.openURL(url)} style={styles.pdfBtn}>
            <Text style={styles.pdfBtnText}>Ver →</Text>
          </Pressable>
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <AppIcon name="close-circle" size={18} color={colors.slate} />
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.photoPreview}>
        <Image source={{ uri: url }} style={styles.photoThumb} resizeMode="cover" />
        <View style={styles.photoActions}>
          <Pressable onPress={() => Linking.openURL(url)} style={styles.photoActionBtn}>
            <AppIcon name="open-in-new" size={13} color={colors.tealDark} />
            <Text style={styles.photoActionText}>Ver original</Text>
          </Pressable>
          <Pressable onPress={() => onChange("")} style={styles.photoActionBtnDestructive}>
            <AppIcon name="close-circle" size={13} color={colors.danger} />
            <Text style={styles.photoActionTextDestructive}>Quitar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.photoPlaceholder, { borderColor: accentColor, backgroundColor: accentTint }]}
      onPress={handlePress}
    >
      <AppIcon name="camera-plus-outline" size={20} color={accentColor} />
      <Text style={[styles.photoPlaceholderText, { color: accentColor }]}>Adjuntar foto o PDF</Text>
    </Pressable>
  );
}

// ── FieldInput ─────────────────────────────────────────────────────────────────
export function FieldInput({
  field,
  value,
  onChange,
  accentColor,
  accentTint,
}: Readonly<{
  field: TemplateField;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  accentColor?: string;
  accentTint?: string;
}>) {
  const { isRut, rutValue, rutInvalid, isEmail, emailValue, emailInvalid } =
    analyzeFieldState(field, value);

  return (
    <View style={styles.inputBlock}>
      <View style={styles.inputLabelRow}>
        <AppIcon name={getFieldIconName(field)} size={16} />
        <Text style={styles.inputLabel}>
          {field.label}
          {field.required ? " *" : ""}
        </Text>
      </View>

      {isRut && (
        <TextInput
          style={[styles.textInput, rutInvalid && styles.textInputError]}
          value={rutValue}
          onChangeText={(text) => onChange(formatRut(text))}
          placeholder="12.345.678-9"
          placeholderTextColor={colors.slate}
          autoCapitalize="characters"
        />
      )}

      {isEmail && (
        <TextInput
          style={[styles.textInput, emailInvalid && styles.textInputError]}
          value={emailValue}
          onChangeText={onChange}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.slate}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      )}

      {!isRut && !isEmail && (field.type === "text" || field.type === "time") && (
        <TextInput
          style={styles.textInput}
          value={value !== undefined ? String(value) : ""}
          onChangeText={onChange}
          placeholder={placeholderFor(field.type)}
          placeholderTextColor={colors.slate}
        />
      )}

      {isRut && rutInvalid && <Text style={styles.errorText}>RUT inválido</Text>}
      {isEmail && emailInvalid && <Text style={styles.errorText}>Correo inválido</Text>}

      {field.type === "date" && (
        <DateField
          value={value !== undefined ? String(value) : ""}
          onChange={onChange}
          placeholder="Seleccionar fecha"
        />
      )}

      {field.type === "number" && (
        <TextInput
          style={styles.textInput}
          value={value !== undefined ? String(value) : ""}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.slate}
        />
      )}

      {field.type === "select" && (
        <DropdownSelect
          value={value !== undefined ? String(value) : undefined}
          options={field.options ?? []}
          onChange={onChange}
          placeholder="Seleccionar opción"
        />
      )}

      {field.type === "scale" && (
        <View style={styles.chipRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.scaleDot, value === n && styles.scaleDotActive]}
            >
              <Text style={[styles.chipText, value === n && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {field.type === "photo" && (
        <PhotoPicker
          value={value}
          onChange={(v) => onChange(v)}
          accentColor={accentColor}
          accentTint={accentTint}
        />
      )}

      {field.type === "signature" && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Firma digital — próximamente</Text>
        </View>
      )}
    </View>
  );
}

function placeholderFor(type: string) {
  if (type === "date") return "AAAA-MM-DD";
  if (type === "time") return "HH:MM";
  return "Escribe aquí";
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { fontSize: 13, color: colors.slate },
  value: { fontSize: 13, color: colors.ink, fontWeight: "500" },

  inputBlock: { marginBottom: spacing.md },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  inputLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs, gap: spacing.xs },
  inputLabel: { fontSize: 12, color: colors.slate },
  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  textInputError: { borderColor: colors.danger },
  errorText: { fontSize: 11, color: colors.danger, marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  scaleDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  scaleDotActive: { backgroundColor: colors.teal, borderColor: colors.teal },

  // Photo picker
  photoPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.teal,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.tealTint,
  },
  photoPlaceholderText: { fontSize: 13, color: colors.teal, fontWeight: "600" },
  photoUploading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
  },
  photoUploadingText: { fontSize: 13, color: colors.slate },
  photoPreview: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  photoThumb: { width: "100%", height: 160 },
  photoActions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  photoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.tealTint,
  },
  photoActionText: { fontSize: 12, color: colors.tealDark, fontWeight: "600" },
  photoActionBtnDestructive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "#FEF2F2",
  },
  photoActionTextDestructive: { fontSize: 12, color: colors.danger, fontWeight: "600" },
  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  pdfName: { flex: 1, fontSize: 13, color: colors.ink },
  pdfBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.tealTint,
  },
  pdfBtnText: { fontSize: 12, color: colors.tealDark, fontWeight: "600" },

  placeholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
  placeholderText: { fontSize: 12, color: colors.slate },
});
