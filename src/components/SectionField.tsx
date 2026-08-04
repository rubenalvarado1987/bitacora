import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { TemplateField } from "../types";
import { colors, radius, spacing } from "../theme";
import DateField from "./DateField";
import DropdownSelect from "./DropdownSelect";
import { formatRut, isRutField, isValidRut } from "../utils/rut";
import { isEmailField, isValidEmail } from "../utils/email";

// Fila de solo lectura, usada para mostrar los datos base de una ficha.
export function FieldDisplay({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value === undefined || value === "" ? "—" : String(value)}</Text>
    </View>
  );
}

// Control editable, usado en el formulario de "nuevo registro".
// Cubre los tipos de campo más comunes; foto y firma quedan como
// marcador de posición para la versión completa (requieren expo-image-picker
// y una librería de firma como react-native-signature-canvas).
export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  const isRut = field.type === "text" && isRutField(field.id || field.label);
  const rutValue = value !== undefined ? String(value) : "";
  const rutInvalid = isRut && rutValue.trim().length > 0 && !isValidRut(rutValue);

  const isEmail = field.type === "text" && !isRut && isEmailField(field.id || field.label);
  const emailValue = value !== undefined ? String(value) : "";
  const emailInvalid = isEmail && emailValue.trim().length > 0 && !isValidEmail(emailValue);

  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>
        {field.label}
        {field.required ? " *" : ""}
      </Text>

      {isRut && (
        <TextInput
          style={[styles.textInput, rutInvalid && styles.textInputError]}
          value={rutValue}
          onChangeText={(text) => onChange(formatRut(text))}
          placeholder="12.345.678-9"
          placeholderTextColor={colors.slate}
          autoCapitalize="characters"
        />
      )}

      {isEmail && (
        <TextInput
          style={[styles.textInput, emailInvalid && styles.textInputError]}
          value={emailValue}
          onChangeText={onChange}
          placeholder="correo@ejemplo.com"
          placeholderTextColor={colors.slate}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      )}

      {!isRut && !isEmail && (field.type === "text" || field.type === "time") && (
        <TextInput
          style={styles.textInput}
          value={value !== undefined ? String(value) : ""}
          onChangeText={onChange}
          placeholder={placeholderFor(field.type)}
          placeholderTextColor={colors.slate}
        />
      )}

      {isRut && rutInvalid && <Text style={styles.errorText}>RUT inválido</Text>}
      {isEmail && emailInvalid && <Text style={styles.errorText}>Correo inválido</Text>}

      {field.type === "date" && (
        <DateField
          value={value !== undefined ? String(value) : ""}
          onChange={onChange}
          placeholder="Seleccionar fecha"
        />
      )}

      {field.type === "number" && (
        <TextInput
          style={styles.textInput}
          value={value !== undefined ? String(value) : ""}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.slate}
        />
      )}

      {field.type === "select" && (
        <DropdownSelect
          value={value !== undefined ? String(value) : undefined}
          options={field.options ?? []}
          onChange={onChange}
          placeholder="Seleccionar opción"
        />
      )}

      {field.type === "scale" && (
        <View style={styles.chipRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.scaleDot, value === n && styles.scaleDotActive]}
            >
              <Text style={[styles.chipText, value === n && styles.chipTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {(field.type === "photo" || field.type === "signature") && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {field.type === "photo" ? "Adjuntar foto" : "Firma digital"} — disponible en la versión completa
          </Text>
        </View>
      )}
    </View>
  );
}

function placeholderFor(type: string) {
  if (type === "date") return "AAAA-MM-DD";
  if (type === "time") return "HH:MM";
  return "Escribe aquí";
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { fontSize: 13, color: colors.slate },
  value: { fontSize: 13, color: colors.ink, fontWeight: "500" },

  inputBlock: { marginBottom: spacing.md },
  inputLabel: { fontSize: 12, color: colors.slate, marginBottom: spacing.xs },
  textInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  textInputError: { borderColor: colors.danger },
  errorText: { fontSize: 11, color: colors.danger, marginTop: spacing.xs },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  scaleDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  scaleDotActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  placeholder: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
  placeholderText: { fontSize: 12, color: colors.slate },
});
