import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppIcon from "./AppIcon";
import { colors, radius, shadow, spacing } from "../theme";
import { Entry } from "../types";

// Configuración semántica de color e ícono por tipo de registro
const CATEGORY: Record<string, {
  color: string;
  bg: string;
  border: string;
  iconName: React.ComponentProps<typeof AppIcon>["name"];
  label: string;
}> = {
  Alimentación: { color: "#C53030", bg: "#FFEEEE", border: "#FCA5A5", iconName: "silverware-fork-knife", label: "ALIMENTACIÓN" },
  Asistencia:   { color: "#166534", bg: "#DCFCE7", border: "#86EFAC", iconName: "account-check", label: "ASISTENCIA" },
  Actividades:  { color: "#9A3412", bg: "#FFF0E6", border: "#FDBA74", iconName: "run", label: "ACTIVIDADES" },
  Emocional:    { color: "#1E40AF", bg: "#EFF6FF", border: "#93C5FD", iconName: "emoticon-happy", label: "EMOCIONAL" },
  Descanso:     { color: "#5B21B6", bg: "#F5F3FF", border: "#C4B5FD", iconName: "sleep", label: "DESCANSO" },
  Higiene:      { color: "#0F766E", bg: "#F0FDFA", border: "#5EEAD4", iconName: "shower", label: "HIGIENE" },
  Medicamentos: { color: "#0369A1", bg: "#F0F9FF", border: "#7DD3FC", iconName: "pill", label: "MEDICAMENTOS" },
  Extras:       { color: "#374151", bg: "#F9FAFB", border: "#D1D5DB", iconName: "plus-box", label: "EXTRAS" },
};

const DEFAULT_CAT = {
  color: colors.slate,
  bg: colors.card,
  border: colors.line,
  iconName: "circle" as React.ComponentProps<typeof AppIcon>["name"],
  label: "REGISTRO",
};

function getCategory(type: string) {
  if (CATEGORY[type]) return CATEGORY[type];
  const key = Object.keys(CATEGORY).find((k) => type.toLowerCase().includes(k.toLowerCase()));
  return key ? CATEGORY[key] : DEFAULT_CAT;
}

function formatFecha(fecha: Date) {
  return fecha.toLocaleString("es-419", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Parsea el valor como galería de URLs:
 * - JSON array  → ["url1","url2",...]
 * - URL suelta  → "https://..."  (campo tipo photo)
 * Retorna [] si el valor no es ninguno de los dos.
 */
function parseUrls(value: string | number | boolean): string[] {
  if (typeof value !== "string" || !value) return [];
  // JSON array
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
        return parsed as string[];
      }
    } catch {
      // not valid JSON
    }
  }
  // URL suelta (foto única)
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return [value];
  }
  return [];
}

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

// ─── Galería de solo lectura con carrusel ────────────────────────────────────

interface ReadOnlyGalleryProps {
  urls: string[];
  accentColor?: string;
}

function ReadOnlyGallery({ urls, accentColor = colors.teal }: ReadOnlyGalleryProps) {
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (urls.length === 0) return null;

  function openAt(i: number) {
    setActiveIndex(i);
    setCarouselOpen(true);
  }

  const current = urls[activeIndex];

  return (
    <View style={galleryStyles.wrap}>
      {/* Thumbnails */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={galleryStyles.strip}>
        {urls.map((url, i) => (
          <Pressable key={url + i} onPress={() => openAt(i)} style={galleryStyles.thumb}>
            {isPdf(url) ? (
              <View style={[galleryStyles.pdfThumb, { backgroundColor: accentColor + "26" }]}>
                <AppIcon name="file-pdf-box" size={22} color={accentColor} />
              </View>
            ) : (
              <Image source={{ uri: url }} style={galleryStyles.thumbImg} />
            )}
            <View style={galleryStyles.eyeBadge}>
              <AppIcon name="eye-outline" size={10} color="#fff" />
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={[galleryStyles.countLabel, { color: accentColor }]}>
        {urls.length} {urls.length === 1 ? "archivo" : "archivos"}
      </Text>

      {/* Carrusel modal */}
      {carouselOpen ? (
        <Modal transparent animationType="fade" onRequestClose={() => setCarouselOpen(false)}>
          <View style={galleryStyles.overlay}>
            {/* Cabecera */}
            <View style={galleryStyles.carouselHeader}>
              <Text style={galleryStyles.carouselCounter}>
                {activeIndex + 1} / {urls.length}
              </Text>
              <Pressable onPress={() => setCarouselOpen(false)} hitSlop={10}>
                <AppIcon name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Imagen principal / PDF */}
            <View style={galleryStyles.carouselMain}>
              {isPdf(current) ? (
                <Pressable
                  style={galleryStyles.pdfCard}
                  onPress={() => {
                    if (typeof window !== "undefined") window.open(current, "_blank");
                  }}
                >
                  <AppIcon name="file-pdf-box" size={48} color="#ef4444" />
                  <Text style={galleryStyles.pdfCardText}>Abrir PDF →</Text>
                </Pressable>
              ) : (
                <Image
                  source={{ uri: current }}
                  style={galleryStyles.carouselImg}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Flechas de navegación */}
            <View style={galleryStyles.navRow}>
              <Pressable
                style={[galleryStyles.navBtn, activeIndex === 0 && galleryStyles.navBtnDisabled]}
                onPress={() => setActiveIndex((p) => Math.max(0, p - 1))}
                disabled={activeIndex === 0}
              >
                <AppIcon name="chevron-left" size={28} color="#fff" />
              </Pressable>
              <Pressable
                style={[galleryStyles.navBtn, activeIndex === urls.length - 1 && galleryStyles.navBtnDisabled]}
                onPress={() => setActiveIndex((p) => Math.min(urls.length - 1, p + 1))}
                disabled={activeIndex === urls.length - 1}
              >
                <AppIcon name="chevron-right" size={28} color="#fff" />
              </Pressable>
            </View>

            {/* Tiras de miniaturas */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={galleryStyles.carouselStripContent}
              style={galleryStyles.carouselStrip}
            >
              {urls.map((url, i) => (
                <Pressable key={url + i} onPress={() => setActiveIndex(i)}>
                  {isPdf(url) ? (
                    <View
                      style={[
                        galleryStyles.stripThumb,
                        i === activeIndex && galleryStyles.stripThumbActive,
                        { backgroundColor: "#333" },
                      ]}
                    >
                      <AppIcon name="file-pdf-box" size={18} color="#ef4444" />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: url }}
                      style={[
                        galleryStyles.stripThumb,
                        i === activeIndex && galleryStyles.stripThumbActive,
                      ]}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const galleryStyles = StyleSheet.create({
  wrap: { marginTop: spacing.xs },
  strip: { flexDirection: "row" },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, marginRight: 6, overflow: "hidden" },
  thumbImg: { width: 64, height: 64 },
  pdfThumb: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  eyeBadge: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    padding: 2,
  },
  countLabel: { fontSize: 10, fontWeight: "600", marginTop: 4 },
  // Carrusel
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "space-between",
  },
  carouselHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: 48,
  },
  carouselCounter: { color: "#fff", fontSize: 13, fontWeight: "600" },
  carouselMain: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  carouselImg: { width: "100%", height: "100%", maxHeight: 400 },
  pdfCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  pdfCardText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  navRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.3 },
  carouselStrip: { maxHeight: 72 },
  carouselStripContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: 6,
  },
  stripThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  stripThumbActive: { borderColor: "#fff" },
});

// ─── Card principal ──────────────────────────────────────────────────────────

interface TimelineEntryCardProps {
  entry: Entry;
  isLast: boolean;
  /** En modo grid no se muestra el dot/línea de timeline */
  gridMode?: boolean;
}

export function TimelineEntryCard({ entry, isLast, gridMode = false }: Readonly<TimelineEntryCardProps>) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const cat = getCategory(entry.type);
  const fecha = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date();
  const valueEntries = Object.entries(entry.values ?? {});

  return (
    <View style={gridMode ? styles.rowGrid : styles.row}>
      {/* Línea vertical + nodo de color (solo en lista) */}
      {!gridMode ? (
        <View style={styles.timeline}>
          <View style={[styles.node, { backgroundColor: cat.color, shadowColor: cat.color }]} />
          {!isLast ? <View style={styles.connector} /> : null}
        </View>
      ) : null}

      {/* Card del registro */}
      <View style={[styles.card, { borderColor: cat.border }]}>
        {/* Badge de categoría */}
        <View style={[styles.badge, { backgroundColor: cat.bg }]}>
          <AppIcon name={cat.iconName} size={12} color={cat.color} />
          <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
        </View>

        {/* Ícono grande de categoría + contenido */}
        <View style={styles.contentRow}>
          <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
            <AppIcon name={cat.iconName} size={24} color={cat.color} />
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.date}>{formatFecha(fecha)}</Text>
            {(() => {
              // Separar campos de imagen de campos de texto
              // Los campos de imagen se muestran SIEMPRE (independiente de su posición alfabética)
              // Los campos de texto se limitan a 2
              const imageEntries = valueEntries.filter(([, val]) => parseUrls(val as string | number | boolean).length > 0);
              const textEntries = valueEntries.filter(([, val]) => parseUrls(val as string | number | boolean).length === 0).slice(0, 2);
              return [...imageEntries, ...textEntries].map(([, val]) => {
                const urls = parseUrls(val as string | number | boolean);
                if (urls.length > 0) {
                  return (
                    <ReadOnlyGallery key={String(val).slice(0, 40)} urls={urls} accentColor={cat.color} />
                  );
                }
                return (
                  <Text key={String(val)} style={styles.value}>{String(val)}</Text>
                );
              });
            })()}
            {entry.authorName ? (
              <Text style={styles.author}>Registrado por {entry.authorName}</Text>
            ) : null}
          </View>

          {/* Acciones rápidas */}
          <View style={styles.actions}>
            <Pressable onPress={() => setPopoverVisible(true)} style={styles.actionBtn} hitSlop={6}>
              <AppIcon name="dots-horizontal" size={16} color={colors.slate} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Popover de detalles */}
      {popoverVisible ? (
        <Modal transparent animationType="fade" onRequestClose={() => setPopoverVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setPopoverVisible(false)}>
            <View style={styles.popover}>
              <Text style={styles.popoverTitle}>{cat.label}</Text>
              {valueEntries.map(([key, val]) => {
                const urls = parseUrls(val as string | number | boolean);
                if (urls.length > 0) {
                  return (
                    <View key={key} style={styles.popoverRow}>
                      <AppIcon name={cat.iconName} size={14} color={colors.slate} />
                      <Text style={styles.popoverKey}>{key}:</Text>
                      <ReadOnlyGallery urls={urls} accentColor={cat.color} />
                    </View>
                  );
                }
                return (
                  <View key={key} style={styles.popoverRow}>
                    <AppIcon name={cat.iconName} size={14} color={colors.slate} />
                    <Text style={styles.popoverKey}>{key}:</Text>
                    <Text style={styles.popoverVal}>{String(val)}</Text>
                  </View>
                );
              })}
              {entry.authorName ? (
                <View style={styles.popoverRow}>
                  <AppIcon name="account-outline" size={14} color={colors.slate} />
                  <Text style={styles.popoverKey}>Autor:</Text>
                  <Text style={styles.popoverVal}>{entry.authorName}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: spacing.md },
  rowGrid: { flexDirection: "row", marginBottom: 0, flex: 1 },
  // --- Timeline vertical ---
  timeline: { width: 28, alignItems: "center" },
  node: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 18,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    zIndex: 1,
  },
  connector: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  // --- Card ---
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.soft,
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginBottom: spacing.xs,
  },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  // --- Contenido ---
  contentRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  date: { fontSize: 11, color: colors.slate, fontVariant: ["tabular-nums"] },
  value: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 2 },
  author: { fontSize: 11, color: colors.slate, marginTop: spacing.xs },
  // --- Acciones ---
  actions: { justifyContent: "center" },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  // --- Popover ---
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.15)", justifyContent: "center", padding: spacing.xl },
  popover: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.soft,
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  popoverTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.tealDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  popoverRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 6 },
  popoverKey: { fontSize: 12, color: colors.slate, flex: 1 },
  popoverVal: { fontSize: 12, fontWeight: "600", color: colors.ink },
});
