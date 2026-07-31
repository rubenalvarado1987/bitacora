import React, { Fragment } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing } from "../theme";

export interface BreadcrumbItem {
  label: string;
  href?: string; // se omite en el último item (página actual)
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Migas de pan pequeñas: "Inicio › ... › Página actual".
export default function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter();

  return (
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  link: { fontSize: 13, color: colors.teal, fontWeight: "700" },
  separator: { fontSize: 13, color: colors.slate },
  current: { fontSize: 13, color: colors.slate, fontWeight: "600" },
});
