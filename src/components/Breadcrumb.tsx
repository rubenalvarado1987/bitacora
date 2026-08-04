import React, { Fragment } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../theme";
import { useAuth } from "../context/AuthContext";

export interface BreadcrumbItem {
  label: string;
  href?: string; // se omite en el último item (página actual)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Migas de pan pequeñas: "Inicio › ... › Página actual".
// Incluye además el nombre y el logo del jardín/organización, visibles en toda la app.
export default function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter();
  const { organization } = useAuth();

  return (
    <View>
      {organization?.name ? (
        <View style={styles.orgRow}>
          {organization.logoUrl ? (
            <Image source={{ uri: organization.logoUrl }} style={styles.orgLogo} />
          ) : null}
          <Text style={styles.orgName} numberOfLines={1}>{organization.name}</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        {items.map((item, idx) => (
          <Fragment key={`${item.label}-${idx}`}>
            {idx > 0 ? <Text style={styles.separator}>›</Text> : null}
            {item.href ? (
              <Pressable onPress={() => router.push(item.href as any)} hitSlop={8}>
                <Text style={styles.link}>{item.label}</Text>
              </Pressable>
            ) : (
              <Text style={styles.current}>{item.label}</Text>
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
  orgName: { fontSize: 13, fontWeight: "700", color: colors.ink, flexShrink: 1 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  link: { fontSize: 13, color: colors.teal, fontWeight: "700" },
  separator: { fontSize: 13, color: colors.slate },
  current: { fontSize: 13, color: colors.slate, fontWeight: "600" },
});
