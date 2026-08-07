import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../../src/context/AuthContext";
import { colors, radius, spacing } from "../../../../src/theme";
import Breadcrumb from "../../../../src/components/Breadcrumb";
import AppIcon from "../../../../src/components/AppIcon";
import { ProfileRecord, Salon } from "../../../../src/types";
import { listenProfiles, listenSalons, removeProfile } from "../../../../src/data/adminRepository";

const ROLE_LABELS: Record<ProfileRecord["role"], string> = {
  admin: "Admin",
  editor: "Editor",
  lector: "Lector",
};

export default function ProfessionalsListScreen() {
  const { membership } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ProfileRecord[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenProfiles(membership.organizationId, setItems);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setSalons);
  }, [membership?.organizationId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.displayName.toLowerCase().includes(term) ||
        item.username.toLowerCase().includes(term)
    );
  }, [items, search]);

  const handleDelete = async (profileId: string) => {
    if (!membership?.organizationId) return;
    await removeProfile(membership.organizationId, profileId);
  };

  const confirmDelete = (item: ProfileRecord) => {
    if (Platform.OS === "web") {
      if (window.confirm(`¿Eliminar a ${item.displayName}?`)) handleDelete(item.id);
      return;
    }
    Alert.alert("Eliminar profesional", `¿Eliminar a ${item.displayName}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => handleDelete(item.id) },
    ]);
  };

  const salonNames = (salonIds?: string[]) =>
    (salonIds ?? []).map((id) => salons.find((s) => s.id === id)?.name ?? id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Panel Admin", href: "/admin" }, { label: "Profesionales" }]} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Profesionales</Text>
        <Pressable style={styles.newButton} onPress={() => router.push("/admin/profesionales/nuevo")}>
          <AppIcon name="plus" size={16} color="#fff" />
          <Text style={styles.newButtonText}>Nuevo</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <AppIcon name="magnify" size={18} color={colors.slate} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o usuario…"
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
          {search.trim() ? "Sin resultados para tu búsqueda." : "Aún no hay profesionales registrados."}
        </Text>
      ) : (
        filtered.map((item) => {
          const salonList = salonNames(item.salonIds);
          return (
            <Pressable
              key={item.id}
              style={styles.listCard}
              onPress={() => router.push(`/admin/profesionales/${item.id}`)}
            >
              <View style={styles.listHeaderRow}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.listAvatar} />
                ) : (
                  <View style={[styles.listAvatar, styles.listAvatarPlaceholder]}>
                    <Text style={styles.listAvatarInitials}>{getInitials(item.displayName)}</Text>
                  </View>
                )}
                <View style={styles.listInfoCol}>
                  <Text style={styles.listTitle}>{item.displayName}</Text>
                  <Text style={styles.listSubtitle}>@{item.username}</Text>
                </View>
                <AppIcon name="chevron-right" size={20} color={colors.slate} />
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.roleBadge}>
                  <AppIcon name="account-tie" size={12} color={colors.tealDark} />
                  <Text style={styles.roleBadgeText}>{ROLE_LABELS[item.role]}</Text>
                </View>
                <View style={[styles.statusBadge, item.active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                  <View style={[styles.statusDot, item.active ? styles.statusDotActive : styles.statusDotInactive]} />
                  <Text style={[styles.statusBadgeText, item.active ? styles.statusTextActive : styles.statusTextInactive]}>
                    {item.active ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                {item.position ? (
                  <View style={styles.infoRow}>
                    <AppIcon name="briefcase-outline" size={14} color={colors.slate} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.position}</Text>
                  </View>
                ) : null}
                {item.phone ? (
                  <View style={styles.infoRow}>
                    <AppIcon name="phone" size={14} color={colors.slate} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.phone}</Text>
                  </View>
                ) : null}
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

              <View style={styles.actionsRow}>
                <Pressable onPress={() => router.push(`/admin/profesionales/${item.id}`)}>
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
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  roleBadgeText: { fontSize: 11, fontWeight: "700", color: colors.tealDark },
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

