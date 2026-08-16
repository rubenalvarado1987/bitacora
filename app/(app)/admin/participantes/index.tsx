import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import AppIcon from "../../../../src/components/AppIcon";
import { Person, Salon } from "../../../../src/types";
import { listenParticipants, listenSalons, removeParticipant } from "../../../../src/data/adminRepository";

export default function ParticipantsListScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Person[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [search, setSearch] = useState("");
  const [expandedInfoIds, setExpandedInfoIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenParticipants(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }, [items, search]);

  const handleDelete = async (participantId: string) => {
    if (!membership?.organizationId) return;
    await removeParticipant(membership.organizationId, participantId);
  };

  const confirmDelete = (item: Person) => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Eliminar a ${item.name}?`)) handleDelete(item.id);
      return;
    }
    Alert.alert("Eliminar participante", `¿Eliminar a ${item.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => handleDelete(item.id) },
    ]);
  };

  const salonNames = (salonIds?: string[]) =>
    (salonIds ?? []).map((id) => salons.find((s) => s.id === id)?.name ?? id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Participantes" }]} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Participantes</Text>
        <Pressable style={styles.newButton} onPress={() => router.push("/admin/participantes/nuevo")}>
          <AppIcon name="plus" size={16} color="#fff" />
          <Text style={styles.newButtonText}>Nuevo</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <AppIcon name="magnify" size={18} color={colors.slate} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar participante por nombre…"
          style={styles.searchInput}
        />
        {search.trim() ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <AppIcon name="close-circle" size={18} color={colors.slate} />
          </Pressable>
        ) : null}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>
          {search.trim() ? "Sin resultados para tu búsqueda." : "Aún no hay participantes registrados."}
        </Text>
      ) : (
        filtered.map((item) => {
          const salonList = salonNames(item.salonIds);
          const important = getImportantInfo(item);
          const isExpanded = !!expandedInfoIds[item.id];
          const allFichaRows = getFullFichaRows(item);
          return (
            <Pressable
              key={item.id}
              style={styles.listCard}
              onPress={() => router.push(`/admin/participantes/${item.id}`)}
            >
              <View style={styles.listHeaderRow}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.listAvatar} />
                ) : (
                  <View style={[styles.listAvatar, styles.listAvatarPlaceholder]}>
                    <Text style={styles.listAvatarInitials}>{getInitials(item.name)}</Text>
                  </View>
                )}
                <View style={styles.listInfoCol}>
                  <Text style={styles.listTitle}>{item.name}</Text>
                  <Text style={styles.listSubtitle}>Información crítica del participante</Text>
                </View>
                <AppIcon name="chevron-right" size={20} color={colors.slate} />
              </View>

              <View style={styles.importantBox}>
                <Text style={styles.importantTitle}>Información importante</Text>
                <InfoLine icon="alert-circle-outline" label="Alergias" value={important.alergias} />
                <InfoLine icon="heart-pulse" label="Condición de salud" value={important.salud} />
                <InfoLine icon="phone-alert" label="Contacto emergencia" value={important.emergencia} />
                <InfoLine icon="account-check-outline" label="Autorizados a retirar" value={important.autorizadosRetiro} />
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, item.status === "activo" ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                  <View style={[styles.statusDot, item.status === "activo" ? styles.statusDotActive : styles.statusDotInactive]} />
                  <Text style={[styles.statusBadgeText, item.status === "activo" ? styles.statusTextActive : styles.statusTextInactive]}>
                    {item.status === "activo" ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <AppIcon name="door" size={14} color={colors.slate} />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {salonList.length > 0 ? salonList.join(", ") : "Sin salones asignados"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <AppIcon name="key-outline" size={14} color={colors.slate} />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {item.linkedUid ? `Acceso · ${item.accountEmail || "correo no registrado"}` : "Sin acceso creado"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.moreInfoBtn}
                onPress={() => setExpandedInfoIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              >
                <AppIcon name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.teal} />
                <Text style={styles.moreInfoText}>{isExpanded ? "Ocultar info" : "+ info"}</Text>
              </Pressable>

              {isExpanded ? (
                <View style={styles.fullInfoBox}>
                  {allFichaRows.length === 0 ? (
                    <Text style={styles.fullInfoEmpty}>Sin datos adicionales en la ficha.</Text>
                  ) : (
                    allFichaRows.map((row) => (
                      <View key={row.key} style={styles.fullInfoRow}>
                        <Text style={styles.fullInfoKey}>{row.label}</Text>
                        <Text style={styles.fullInfoValue}>{row.value}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable onPress={() => router.push(`/person/${item.id}`)}>
                  <Text style={styles.actionLink}>Ver bitácora</Text>
                </Pressable>
                <Pressable onPress={() => router.push(`/admin/participantes/${item.id}`)}>
                  <Text style={styles.actionLink}>Editar</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)}>
                  <Text style={styles.actionDanger}>Eliminar</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function getFirstFilled(baseData: Record<string, string | number | boolean> | undefined, keys: string[]): string {
  if (!baseData) return "No informado";
  for (const key of keys) {
    const raw = baseData[key];
    if (raw === undefined || raw === null) continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return "No informado";
}

function prettifyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

function getImportantInfo(person: Person) {
  const baseData = person.baseData;
  return {
    alergias: getFirstFilled(baseData, ["alergias", "alergia", "alergias_medicamentos"]),
    salud: getFirstFilled(baseData, ["condicion_salud", "antecedentes_salud", "diagnostico", "enfermedades_base", "prevision_salud", "centro_salud"]),
    emergencia: getFirstFilled(baseData, ["contacto_emergencia_nombre", "contacto_emergencia", "contacto_emergencia_telefono", "telefono_emergencia"]),
    autorizadosRetiro: getFirstFilled(baseData, ["personas_autorizadas_retiro", "autorizados_retiro", "retiro_autorizado"]),
  };
}

function getFullFichaRows(person: Person): Array<{ key: string; label: string; value: string }> {
  const entries = Object.entries(person.baseData ?? {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0)
    .map(([key, value]) => ({ key, label: prettifyKey(key), value: String(value) }));
  return entries;
}

function InfoLine({ icon, label, value }: { icon: React.ComponentProps<typeof AppIcon>["name"]; label: string; value: string }) {
  return (
    <View style={styles.importantRow}>
      <AppIcon name={icon} size={14} color={colors.slate} />
      <Text style={styles.importantLabel}>{label}:</Text>
      <Text style={styles.importantValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  newButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 6 },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
  listCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  listHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  listInfoCol: { flex: 1 },
  listAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.line },
  listAvatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  listAvatarInitials: { color: colors.tealDark, fontSize: 13, fontWeight: "700" },
  listTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  listSubtitle: { fontSize: 12, color: colors.slate, marginTop: 1 },
  importantBox: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: "rgba(248,250,252,0.9)",
    padding: spacing.sm,
    gap: 6,
  },
  importantTitle: { fontSize: 11, fontWeight: "700", color: colors.ink, textTransform: "uppercase", letterSpacing: 0.4 },
  importantRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  importantLabel: { fontSize: 11, color: colors.slate, fontWeight: "700" },
  importantValue: { fontSize: 11, color: colors.ink, flex: 1 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  statusBadgeActive: { backgroundColor: "#E3F6EA" },
  statusBadgeInactive: { backgroundColor: "#F1F1F3" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: "#2FA45C" },
  statusDotInactive: { backgroundColor: colors.slate },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusTextActive: { color: "#1E7A3F" },
  statusTextInactive: { color: colors.slate },
  infoGrid: { marginTop: spacing.sm, gap: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, color: colors.slate, flexShrink: 1 },
  moreInfoBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  moreInfoText: { fontSize: 12, fontWeight: "700", color: colors.teal },
  fullInfoBox: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 6,
  },
  fullInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  fullInfoKey: { fontSize: 11, color: colors.slate, fontWeight: "700", minWidth: 120 },
  fullInfoValue: { fontSize: 11, color: colors.ink, flex: 1 },
  fullInfoEmpty: { fontSize: 11, color: colors.slate },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionLink: { color: colors.teal, fontWeight: "700" },
  actionDanger: { color: colors.danger, fontWeight: "700" },
});

