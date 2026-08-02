import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

interface DropdownSelectProps {
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DropdownSelect({
  value,
  options,
  onChange,
  placeholder = "Seleccionar",
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = value && options.includes(value) ? value : null;

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={selectedLabel ? styles.fieldText : styles.placeholderText}>
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.dropdown} onPress={(e) => e.stopPropagation()}>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.option, selectedLabel === option && styles.optionSelected]}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, selectedLabel === option && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldText: { fontSize: 14, color: colors.ink, flex: 1 },
  placeholderText: { fontSize: 14, color: colors.slate, flex: 1 },
  arrow: { fontSize: 10, color: colors.slate, marginLeft: spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(27,36,48,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  dropdown: {
    width: "100%",
    maxWidth: 300,
    maxHeight: 400,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  optionsList: { maxHeight: 400 },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  optionSelected: { backgroundColor: colors.tealTint },
  optionText: { fontSize: 14, color: colors.ink },
  optionTextSelected: { color: colors.tealDark, fontWeight: "700" },
});
