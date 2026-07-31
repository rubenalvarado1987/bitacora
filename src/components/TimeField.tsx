import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

interface TimeFieldProps {
  value?: string; // "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
}

// Selector de hora propio (sin dependencias nativas), formato 24 horas HH:MM.
export default function TimeField({ value, onChange, placeholder = "Seleccionar hora" }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState("08");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const openPicker = () => {
    const [h, m] = (value ?? "").split(":");
    setSelectedHour(h || "08");
    setSelectedMinute(m || "00");
    setOpen(true);
  };

  const confirm = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setOpen(false);
  };

  return (
    <>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.fieldText : styles.placeholderText}>{value || placeholder}</Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Selecciona la hora</Text>
            <View style={styles.columns}>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <Pressable
                    key={h}
                    style={[styles.cell, h === selectedHour && styles.cellSelected]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[styles.cellText, h === selectedHour && styles.cellTextSelected]}>{h}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.colon}>:</Text>
              <ScrollView style={styles.column} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.cell, m === selectedMinute && styles.cellSelected]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={[styles.cellText, m === selectedMinute && styles.cellTextSelected]}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Pressable style={styles.confirmButton} onPress={confirm}>
              <Text style={styles.confirmButtonText}>
                Aceptar {selectedHour}:{selectedMinute}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  fieldText: { fontSize: 14, color: colors.ink },
  placeholderText: { fontSize: 14, color: colors.slate },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(27,36,48,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 260,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm, textAlign: "center" },
  columns: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm },
  column: { height: 180, width: 64 },
  colon: { fontSize: 18, fontWeight: "700", color: colors.ink },
  cell: { paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.sm },
  cellSelected: { backgroundColor: colors.tealTint },
  cellText: { fontSize: 14, color: colors.slate },
  cellTextSelected: { color: colors.tealDark, fontWeight: "700" },
  confirmButton: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confirmButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
