import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { showAlert } from "../../src/utils/alert";
import {
  CalendarEventDraft,
  listenCalendarEvents,
  removeCalendarEvent,
  saveCalendarEvent,
} from "../../src/data/calendarRepository";
import DateField from "../../src/components/DateField";
import TimeField from "../../src/components/TimeField";
import { formatCLDate } from "../../src/utils/date";
import { colors, radius, spacing } from "../../src/theme";
import { CalendarEvent } from "../../src/types";

const SCOPES = ["global", "salon"] as const;
type ScopeFilter = "todos" | "global" | "salon";

const emptyDraft: CalendarEventDraft = { title: "", date: "", time: "", description: "", scope: "global" };

export default function CalendarioScreen() {
  const { membership } = useAuth();
  const role = membership?.role ?? "lector";
  const canEdit = role === "admin" || role === "editor" || role === "profesional";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filter, setFilter] = useState<ScopeFilter>("todos");
  const [draft, setDraft] = useState<CalendarEventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenCalendarEvents(membership.organizationId, setEvents);
  }, [membership?.organizationId]);

  const filtered = filter === "todos" ? events : events.filter((e) => e.scope === filter);

  // Group events by date
  const grouped = filtered.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!membership?.organizationId || !membership.uid) return;
    if (!draft.title.trim() || !draft.date.trim()) {
      showAlert("Faltan datos", "Completa título y fecha.");
      return;
    }
    try {
      await saveCalendarEvent(membership.organizationId, draft, membership.uid, editingId ?? undefined);
      resetForm();
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      date: event.date,
      time: event.time ?? "",
      description: event.description ?? "",
      salonId: event.salonId ?? "",
      scope: event.scope,
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!membership?.organizationId) return;
    await removeCalendarEvent(membership.organizationId, eventId);
    if (editingId === eventId) resetForm();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Calendario" }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Scope filter chips */}
        <View style={styles.filterRow}>
          {(["todos", "global", "salon"] as ScopeFilter[]).map((scope) => (
            <Pressable
              key={scope}
              onPress={() => setFilter(scope)}
              style={[styles.filterChip, filter === scope && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === scope && styles.filterTextActive]}>
                {scope === "todos" ? "Todos" : scope === "global" ? "Global" : "Por salón"}
              </Text>
            </Pressable>
          ))}
          {canEdit ? (
            <Pressable onPress={() => setShowForm((v) => !v)} style={styles.addButton}>
              <Text style={styles.addButtonText}>{showForm ? "Cancelar" : "+ Agregar"}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Form */}
        {showForm && canEdit ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? "Editar evento" : "Nuevo evento"}</Text>
            <TextInput value={draft.title} onChangeText={(v) => setDraft({ ...draft, title: v })} placeholder="Título" style={styles.input} />
            <DateField value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} placeholder="Fecha (DD-MM-AAAA)" />
            <TimeField value={draft.time ?? ""} onChange={(v) => setDraft({ ...draft, time: v })} placeholder="Hora (HH:MM)" />
            <TextInput value={draft.description ?? ""} onChangeText={(v) => setDraft({ ...draft, description: v })} placeholder="Descripción" style={styles.input} />
            <View style={styles.scopeRow}>
              {SCOPES.map((s) => (
                <Pressable key={s} onPress={() => setDraft({ ...draft, scope: s })} style={[styles.scopeChip, draft.scope === s && styles.scopeChipActive]}>
                  <Text style={[styles.scopeText, draft.scope === s && styles.scopeTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Event list grouped by date */}
        {sortedDates.length === 0 ? (
          <Text style={styles.empty}>No hay eventos para mostrar.</Text>
        ) : (
          sortedDates.map((date) => (
            <View key={date}>
              <Text style={styles.dateHeader}>{formatCLDate(date)}</Text>
              {grouped[date].map((e) => (
                <View key={e.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>{e.title}</Text>
                    <View style={styles.scopeBadge}>
                      <Text style={styles.scopeBadgeText}>{e.scope}</Text>
                    </View>
                  </View>
                  {e.time ? <Text style={styles.eventMeta}>{e.time}</Text> : null}
                  {e.description ? <Text style={styles.eventMeta}>{e.description}</Text> : null}
                  {canEdit ? (
                    <View style={styles.actionsRow}>
                      <Pressable onPress={() => startEdit(e)}><Text style={styles.actionLink}>Editar</Text></Pressable>
                      <Pressable onPress={() => handleDelete(e.id)}><Text style={styles.actionDanger}>Eliminar</Text></Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.paper },
  filterChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  filterText: { fontSize: 13, color: colors.slate, fontWeight: "600" },
  filterTextActive: { color: colors.tealDark },
  addButton: { marginLeft: "auto", backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  formCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  formTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  scopeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  scopeChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  scopeChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  scopeText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  scopeTextActive: { color: colors.tealDark },
  saveButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  dateHeader: { fontSize: 13, fontWeight: "700", color: colors.tealDark, marginTop: spacing.md, marginBottom: spacing.xs },
  eventCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  eventHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  eventTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  scopeBadge: { backgroundColor: colors.tealTint, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  scopeBadgeText: { fontSize: 11, color: colors.tealDark, fontWeight: "600" },
  eventMeta: { fontSize: 12, color: colors.slate, marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  actionLink: { color: colors.teal, fontWeight: "700", fontSize: 13 },
  actionDanger: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  empty: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
});
