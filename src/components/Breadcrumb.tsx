import React, { Fragment, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, radius, shadow, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";
import { listenMyParticipant, listenMyProfile } from "../data/adminRepository";
import { listenUnreadThreadCount } from "../data/chatRepository";
import { Person, ProfileRecord } from "../types";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: Readonly<BreadcrumbProps>) {
  const router = useRouter();
  const { user, membership, organization } = useAuth();
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [myParticipant, setMyParticipant] = useState<Person | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgAvatarFailed, setOrgAvatarFailed] = useState(false);
  const [userAvatarFailed, setUserAvatarFailed] = useState(false);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenMyParticipant(membership.organizationId, membership.uid, setMyParticipant);
  }, [membership?.organizationId, membership?.uid]);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid) return;
    return listenUnreadThreadCount(
      membership.organizationId,
      membership.uid,
      membership.role,
      setUnreadCount
    );
  }, [membership?.organizationId, membership?.uid, membership?.role]);

  useEffect(() => {
    setOrgAvatarFailed(false);
  }, [organization?.logoUrl]);

  useEffect(() => {
    setUserAvatarFailed(false);
  }, [myProfile?.photoUrl, myParticipant?.photoUrl, user?.photoURL]);

  const orgInitials = (organization?.name ?? "Organización")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const userAvatarUri = myProfile?.photoUrl ?? myParticipant?.photoUrl ?? user?.photoURL ?? null;

  // Iniciales del usuario activo para el avatar fallback
  const userInitials = (myProfile?.displayName ?? user?.displayName ?? user?.email ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={styles.bar}>
      {/* ── Izquierda: avatar contextual + migas ── */}
      <View style={styles.left}>
        {/* Avatar del perfil activo (foto o iniciales) */}
        {organization?.logoUrl && !orgAvatarFailed ? (
          <Image
            source={{ uri: organization.logoUrl }}
            style={styles.userAvatar}
            onError={() => setOrgAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
            <Text style={styles.userAvatarInitials}>{orgInitials}</Text>
          </View>
        )}

        {/* Migas de pan */}
        <View style={styles.crumbs}>
          {items.map((item, idx) => (
            <Fragment key={`${item.label}-${idx}`}>
              {idx > 0 ? (
                <AppIcon name="chevron-right" size={12} color={colors.slate} />
              ) : null}
              {item.href ? (
                <Pressable onPress={() => router.push(item.href as any)} hitSlop={8}>
                  <View style={styles.crumbItem}>
                    {idx === 0 ? (
                      <AppIcon name="home-outline" size={13} color={colors.teal} />
                    ) : null}
                    <Text style={styles.crumbLink} numberOfLines={1}>{item.label}</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.crumbItem}>
                  {idx === 0 ? (
                    <AppIcon name="home-outline" size={13} color={colors.slate} />
                  ) : null}
                  <Text style={styles.crumbCurrent} numberOfLines={1}>{item.label}</Text>
                </View>
              )}
            </Fragment>
          ))}
        </View>
      </View>

      {/* ── Derecha: notificaciones + avatar de sesión ── */}
      <View style={styles.right}>
        <Pressable style={styles.notifPill} hitSlop={6} onPress={() => router.push("/chat" as any)}>
          <AppIcon name="bell-outline" size={15} color={colors.ink} />
          <Text style={styles.notifLabel}>Notificaciones</Text>
          {unreadCount > 0 ? (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>

        {userAvatarUri && !userAvatarFailed ? (
          <Image
            source={{ uri: userAvatarUri }}
            style={styles.sessionAvatar}
            onError={() => setUserAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.sessionAvatar, styles.sessionAvatarPlaceholder]}>
            <Text style={styles.sessionAvatarInitials}>{userInitials}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  // --- Izquierda ---
  left: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, overflow: "hidden" },
  userAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#fff" },
  userAvatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  userAvatarInitials: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  crumbs: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 2, flexShrink: 1 },
  crumbItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  crumbLink: { fontSize: 12, color: colors.teal, fontWeight: "700" },
  crumbCurrent: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  // --- Derecha ---
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 0 },
  notifPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  notifLabel: { fontSize: 12, fontWeight: "600", color: colors.ink },
  notifBadge: {
    backgroundColor: "#EF4444",
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  notifBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  sessionAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#fff" },
  sessionAvatarPlaceholder: { backgroundColor: colors.tealTint, alignItems: "center", justifyContent: "center" },
  sessionAvatarInitials: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
});

