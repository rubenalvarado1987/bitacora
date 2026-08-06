import React, { Fragment } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";

export interface BreadcrumbItem {
  label: string;
  href?: string; // se omite en el último item (página actual)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Migas de pan pequeñas: "Inicio › ... › Página actual".
// Incluye además el nombre y el logo del jardín/organización, visibles en toda la app.
export default function Breadcrumb({ items }: Readonly<BreadcrumbProps>) {
  const router = useRouter();
  const { organization } = useAuth();

  return (
    <View>
      {organization?.name ? (
        <View style={styles.orgRow}>
          {organization.logoUrl ? (
            <Image source={{ uri: organization.logoUrl }} style={styles.orgLogo} />
          ) : (
            <View style={styles.orgLogoPlaceholder}>
              <AppIcon name="domain" size={14} color={colors.tealDark} />
            </View>
          )}
          <Text style={styles.orgName} numberOfLines={1}>{organization.name}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        {items.map((item, idx) => (
          <Fragment key={`${item.label}-${idx}`}>
            {idx > 0 ? <AppIcon name="chevron-right" size={14} color={colors.slate} /> : null}
            {item.href ? (
              <Pressable onPress={() => router.push(item.href as any)} hitSlop={8}>
                <View style={styles.itemWithIcon}>
                  {idx === 0 ? <AppIcon name="home-outline" size={14} color={colors.teal} /> : null}
                  <Text style={styles.link}>{item.label}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={styles.itemWithIcon}>
                {idx === 0 ? <AppIcon name="home-outline" size={14} color={colors.slate} /> : null}
                <Text style={styles.current}>{item.label}</Text>
              </View>
            )}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orgRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  orgLogo: { width: 24, height: 24, borderRadius: 6 },
  orgLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.tealTint,
    alignItems: "center",
    justifyContent: "center",
  },
  orgName: { fontSize: 13, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  itemWithIcon: { flexDirection: "row", alignItems: "center", gap: 4 },
  link: { fontSize: 13, color: colors.teal, fontWeight: "700" },
  separator: { fontSize: 13, color: colors.slate },
  current: { fontSize: 13, color: colors.slate, fontWeight: "600" },
});
