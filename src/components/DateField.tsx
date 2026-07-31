import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";
import { formatCLDate, parseISODate, toISODate } from "../utils/date";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS_ES = ["L", "M", "M", "J", "V", "S", "D"];

interface DateFieldProps {
  value: string; // ISO aaaa-mm-dd (o "")
  onChange: (iso: string) => void;
  placeholder?: string;
}

// Selector de fecha propio (sin dependencias nativas) que siempre muestra formato chileno DD-MM-AAAA.
export default function DateField({ value, onChange, placeholder = "Seleccionar fecha" }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => parseISODate(value) ?? new Date());

  const openPicker = () => {
    setCursor(parseISODate(value) ?? new Date());
    setOpen(true);
  };

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectDay = (day: number) => {
    onChange(toISODate(new Date(year, month, day)));
    setOpen(false);
  };

  const changeMonth = (delta: number) =>
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  return (
    <>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.fieldText : styles.placeholderText}>
          {value ? formatCLDate(value) : placeholder}
        </Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>
                {MONTHS_ES[month]} {year}
              </Text>
              <Pressable onPress={() => changeMonth(1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS_ES.map((w, i) => (
                <Text key={`${w}-${i}`} style={styles.weekday}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`empty-${idx}`} style={styles.dayCell} />;
                const iso = toISODate(new Date(year, month, day));
                const isSelected = iso === value;
                return (
                  <Pressable
                    key={iso}
                    style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                    onPress={() => selectDay(day)}
                  >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.todayButton}
              onPress={() => {
                onChange(toISODate(new Date()));
                setOpen(false);
              }}
            >
              <Text style={styles.todayButtonText}>Hoy</Text>
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
  calendarCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  navButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  navButtonText: { fontSize: 20, color: colors.teal, fontWeight: "700" },
  calendarTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, textTransform: "capitalize" },
  weekRow: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 11, color: colors.slate, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayCellSelected: { backgroundColor: colors.teal, borderRadius: radius.pill },
  dayText: { fontSize: 13, color: colors.ink },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  todayButton: { marginTop: spacing.sm, alignSelf: "center" },
  todayButtonText: { color: colors.teal, fontWeight: "700", fontSize: 13 },
});
