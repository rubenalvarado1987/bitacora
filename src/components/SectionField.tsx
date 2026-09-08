import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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

// ── PhotoGalleryPicker ─────────────────────────────────────────────────────────
const MAX_FILES = 10;

function parseUrls(value: string | number | undefined): string[] {
  if (!value) return [];
  try { return JSON.parse(String(value)) as string[]; } catch { return []; }
}

function PhotoGalleryPicker({
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
  const urls = parseUrls(value);
  const [uploading, setUploading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);

  const screenW = Dimensions.get("window").width;

  const commit = (next: string[]) => onChange(JSON.stringify(next));

  const pickAndUpload = async (uri: string) => {
    const publicUrl = await uploadEntryFile(uri);
    commit([...urls, publicUrl]);
  };

  const handleAdd = async () => {
    if (urls.length >= MAX_FILES) {
      Alert.alert("Límite alcanzado", `Máximo ${MAX_FILES} archivos por registro.`);
      return;
    }
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp,application/pdf";
      input.multiple = false;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        setUploading(true);
        try { await pickAndUpload(URL.createObjectURL(file)); }
        catch (e: any) { Alert.alert("Error", e?.message ?? "No se pudo subir el archivo."); }
        finally { setUploading(false); }
      };
      input.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    setUploading(true);
    try { await pickAndUpload(result.assets[0].uri); }
    catch (e: any) { Alert.alert("Error", e?.message ?? "No se pudo subir el archivo."); }
    finally { setUploading(false); }
  };

  const openCarousel = (index: number) => { setCarouselIndex(index); setShowCarousel(true); };

  const removeAt = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    commit(next);
    if (carouselIndex >= next.length && carouselIndex > 0) setCarouselIndex(carouselIndex - 1);
    if (next.length === 0) setShowCarousel(false);
  };

  return (
    <View>
      {/* Galería en miniatura */}
      <View style={styles.galleryGrid}>
        {urls.map((url, i) => {
          const isPdf = url.toLowerCase().endsWith(".pdf");
          return (
            <Pressable key={`${url}-${i}`} style={styles.galleryThumbWrap} onPress={() => openCarousel(i)}>
              {isPdf ? (
                <View style={[styles.galleryThumb, styles.galleryPdfThumb]}>
                  <AppIcon name="file-pdf-box" size={28} color={colors.danger} />
                  <Text style={styles.galleryPdfLabel} numberOfLines={1}>PDF</Text>
                </View>
              ) : (
                <Image source={{ uri: url }} style={styles.galleryThumb} resizeMode="cover" />
              )}
              <View style={styles.galleryThumbBadge}>
                <AppIcon name="eye-outline" size={11} color="#fff" />
              </View>
            </Pressable>
          );
        })}

        {/* Botón agregar */}
        {urls.length < MAX_FILES && (
          <Pressable
            style={[styles.galleryAddBtn, { borderColor: accentColor, backgroundColor: accentTint }]}
            onPress={handleAdd}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={accentColor} size="small" />
            ) : (
              <>
                <AppIcon name="camera-plus-outline" size={22} color={accentColor} />
                <Text style={[styles.galleryAddText, { color: accentColor }]}>
                  {urls.length === 0 ? "Adjuntar" : "Agregar"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {urls.length > 0 && (
        <Text style={styles.galleryCount}>{urls.length} / {MAX_FILES} archivos</Text>
      )}

      {/* ── Modal carrusel ── */}
      <Modal visible={showCarousel} transparent animationType="fade" onRequestClose={() => setShowCarousel(false)}>
        <View style={styles.carouselOverlay}>
          {/* Header */}
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselCounter}>{carouselIndex + 1} / {urls.length}</Text>
            <Pressable onPress={() => setShowCarousel(false)} hitSlop={12} style={styles.carouselCloseBtn}>
              <AppIcon name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Imagen / PDF */}
          <View style={styles.carouselImageWrap}>
            {urls[carouselIndex]?.toLowerCase().endsWith(".pdf") ? (
              <Pressable style={styles.carouselPdfCard} onPress={() => Linking.openURL(urls[carouselIndex])}>
                <AppIcon name="file-pdf-box" size={64} color={colors.danger} />
                <Text style={styles.carouselPdfText}>Toca para abrir el PDF</Text>
              </Pressable>
            ) : (
              <Image
                source={{ uri: urls[carouselIndex] }}
                style={[styles.carouselImage, { width: Math.min(screenW - 48, 480) }]}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Navegación */}
          <View style={styles.carouselNav}>
            <Pressable
              style={[styles.carouselNavBtn, carouselIndex === 0 && styles.carouselNavBtnDisabled]}
              onPress={() => setCarouselIndex((i) => Math.max(0, i - 1))}
              disabled={carouselIndex === 0}
            >
              <AppIcon name="chevron-left" size={28} color="#fff" />
            </Pressable>

            <Pressable style={styles.carouselDeleteBtn} onPress={() => removeAt(carouselIndex)}>
              <AppIcon name="trash-can-outline" size={20} color="#fff" />
              <Text style={styles.carouselDeleteText}>Eliminar</Text>
            </Pressable>

            <Pressable
              style={[styles.carouselNavBtn, carouselIndex === urls.length - 1 && styles.carouselNavBtnDisabled]}
              onPress={() => setCarouselIndex((i) => Math.min(urls.length - 1, i + 1))}
              disabled={carouselIndex === urls.length - 1}
            >
              <AppIcon name="chevron-right" size={28} color="#fff" />
            </Pressable>
          </View>

          {/* Miniaturas en fila */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselStrip}>
            {urls.map((url, i) => {
              const isPdf = url.toLowerCase().endsWith(".pdf");
              return (
                <Pressable key={`strip-${i}`} onPress={() => setCarouselIndex(i)}>
                  {isPdf ? (
                    <View style={[styles.stripThumb, i === carouselIndex && styles.stripThumbActive, styles.stripPdf]}>
                      <AppIcon name="file-pdf-box" size={18} color={colors.danger} />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: url }}
                      style={[styles.stripThumb, i === carouselIndex && styles.stripThumbActive]}
                      resizeMode="cover"
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
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

      {field.type === "photo-multi" && (
        <PhotoGalleryPicker
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

  // Gallery
  galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  galleryThumbWrap: { width: 80, height: 80, borderRadius: radius.sm, overflow: "hidden", position: "relative" },
  galleryThumb: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: colors.line },
  galleryPdfThumb: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F0" },
  galleryPdfLabel: { fontSize: 9, color: colors.danger, fontWeight: "700", marginTop: 2 },
  galleryThumbBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    padding: 3,
  },
  galleryAddBtn: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  galleryAddText: { fontSize: 11, fontWeight: "700" },
  galleryCount: { fontSize: 11, color: colors.slate, marginTop: 6 },

  // Carousel modal
  carouselOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  carouselHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  carouselCounter: { fontSize: 14, color: "#fff", fontWeight: "600" },
  carouselCloseBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 6,
  },
  carouselImageWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginTop: 56,
    marginBottom: 8,
  },
  carouselImage: { height: 340, borderRadius: radius.md },
  carouselPdfCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: radius.lg,
  },
  carouselPdfText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  carouselNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  carouselNavBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    padding: 8,
  },
  carouselNavBtnDisabled: { opacity: 0.3 },
  carouselDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  carouselDeleteText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  carouselStrip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  stripThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.line,
    borderWidth: 2,
    borderColor: "transparent",
  },
  stripThumbActive: { borderColor: "#fff" },
  stripPdf: { alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F0" },
});
