import React, { useEffect, useMemo, useState } from "react";
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
import Breadcrumb from "../../src/components/Breadcrumb";
import {
  CalendarEventDraft,
  eventOccursOnDate,
  listenCalendarEvents,
  removeCalendarEvent,
  saveCalendarEvent,
} from "../../src/data/calendarRepository";
import { listenMyProfile, listenParticipants, listenSalons } from "../../src/data/adminRepository";
import DateField from "../../src/components/DateField";
import TimeField from "../../src/components/TimeField";
import { formatCLDate, parseISODate, todayISODate, toISODate } from "../../src/utils/date";
import { colors, radius, spacing } from "../../src/theme";
import { CalendarEvent, Person, ProfileRecord, Salon } from "../../src/types";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS_ES = ["L", "M", "M", "J", "V", "S", "D"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const RECURRENCE_OPTIONS: { key: CalendarEventDraft["recurrence"]; label: string }[] = [
  { key: "single", label: "Un día" },
  { key: "range", label: "Rango de días" },
  { key: "daily", label: "Todos los días" },
];

const emptyDraft: CalendarEventDraft = {
  title: "",
  recurrence: "single",
  date: "",
  endDate: "",
  startTime: "",
  endTime: "",
  description: "",
  scope: "global",
};

function shiftDay(iso: string, delta: number) {
  const date = parseISODate(iso) ?? new Date();
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}

export default function CalendarioScreen() {
  const { membership } = useAuth();
  const role = membership?.role ?? "lector";
  const isAdmin = role === "admin";
  const isEditorRole = role === "editor" || role === "profesional";
  const isViewerRole = role === "lector" || role === "lectura";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allSalons, setAllSalons] = useState<Salon[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [linkedParticipants, setLinkedParticipants] = useState<Person[]>([]);

  const [viewMode, setViewMode] = useState<"mensual" | "diaria">("mensual");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [filter, setFilter] = useState<string>("todos");
  const [draft, setDraft] = useState<CalendarEventDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenCalendarEvents(membership.organizationId, setEvents);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    return listenSalons(membership.organizationId, setAllSalons);
  }, [membership?.organizationId]);

  useEffect(() => {
    if (!membership?.organizationId || !membership.uid || !isEditorRole) {
      setMyProfile(null);
      return;
    }
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid, isEditorRole]);

  useEffect(() => {
    if (!membership?.organizationId || !isViewerRole) {
      setLinkedParticipants([]);
      return;
    }
    return listenParticipants(membership.organizationId, (items) =>
      setLinkedParticipants(items.filter((p) => p.linkedUid && p.linkedUid === membership.uid))
    );
  }, [membership?.organizationId, membership?.uid, isViewerRole]);

  // Salones visibles según el rol: admin ve todos, editor/profesional solo los suyos,
  // apoderado solo los de sus participantes vinculados, y un "lector" de staff (sin
  // participantes vinculados) ve todos en modo solo lectura.
  const isGuardian = isViewerRole && linkedParticipants.length > 0;
  const visibleSalons = useMemo(() => {
    if (isAdmin) return allSalons;
    if (isEditorRole) return myProfile ? allSalons.filter((s) => s.professionalIds.includes(myProfile.id)) : [];
    if (isGuardian) {
      const ids = new Set(linkedParticipants.flatMap((p) => p.salonIds ?? []));
      return allSalons.filter((s) => ids.has(s.id));
    }
    return allSalons;
  }, [isAdmin, isEditorRole, isGuardian, allSalons, myProfile, linkedParticipants]);

  const visibleSalonIds = useMemo(() => new Set(visibleSalons.map((s) => s.id)), [visibleSalons]);
  const canEdit = isAdmin || (isEditorRole && visibleSalons.length > 0);

  const visibleEvents = useMemo(
    () => events.filter((e) => e.scope === "global" || (e.salonId && visibleSalonIds.has(e.salonId))),
    [events, visibleSalonIds]
  );

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [{ key: "global", label: "Global" }];
    visibleSalons.forEach((s) => chips.push({ key: s.id, label: s.name }));
    if (chips.length > 1) chips.unshift({ key: "todos", label: "Todos" });
    return chips;
  }, [visibleSalons]);

  useEffect(() => {
    if (!filterChips.some((c) => c.key === filter)) {
      setFilter(filterChips[0]?.key ?? "todos");
    }
  }, [filterChips, filter]);

  const filteredEvents = useMemo(() => {
    if (filter === "todos") return visibleEvents;
    if (filter === "global") return visibleEvents.filter((e) => e.scope === "global");
    return visibleEvents.filter((e) => e.scope === "salon" && e.salonId === filter);
  }, [visibleEvents, filter]);

  const selectedDayEvents = useMemo(() => {
    const items = filteredEvents.filter((e) => eventOccursOnDate(e, selectedDate));
    return items.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }, [filteredEvents, selectedDate]);

  const allDayEvents = selectedDayEvents.filter((e) => !e.startTime);
  const timedEvents = selectedDayEvents.filter((e) => e.startTime);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Se usan updaters funcionales porque react-native-web a veces dispara onPress más de
  // una vez por click; con un closure fijo esto hacía que el mes pareciera "no cambiar".
  const changeMonth = (delta: number) => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const changeYear = (delta: number) => setCursor((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  const changeSelectedDay = (delta: number) => setSelectedDate((prev) => shiftDay(prev, delta));

  const canManageEvent = (event: CalendarEvent) =>
    isAdmin || (isEditorRole && event.scope === "salon" && visibleSalonIds.has(event.salonId ?? ""));

  const resetForm = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      date: selectedDate,
      scope: isEditorRole ? "salon" : "global",
      salonId: isEditorRole ? visibleSalons[0]?.id : undefined,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!membership?.organizationId || !membership.uid) return;
    if (!draft.title.trim()) {
      showAlert("Faltan datos", "Completa el título.");
      return;
    }
    if (draft.recurrence !== "daily" && !draft.date.trim()) {
      showAlert("Faltan datos", "Completa la fecha.");
      return;
    }
    if (draft.recurrence === "range" && draft.endDate && draft.endDate < draft.date) {
      showAlert("Rango inválido", "La fecha de término debe ser igual o posterior a la de inicio.");
      return;
    }
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      showAlert("Horario inválido", "La hora de término debe ser posterior a la de inicio.");
      return;
    }
    if (draft.scope === "salon" && !draft.salonId) {
      showAlert("Falta el salón", "Selecciona un salón para esta actividad.");
      return;
    }
    if (isEditorRole && draft.scope === "salon" && !visibleSalonIds.has(draft.salonId ?? "")) {
      showAlert("Sin permiso", "Solo puedes agregar actividades en tus salones asignados.");
      return;
    }
    const payload: CalendarEventDraft = {
      ...draft,
      date: draft.recurrence === "daily" ? draft.date || todayISODate() : draft.date,
    };
    try {
      await saveCalendarEvent(membership.organizationId, payload, membership.uid, editingId ?? undefined);
      resetForm();
    } catch (e: any) {
      showAlert("No se pudo guardar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const startEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      recurrence: event.recurrence,
      date: event.date,
      endDate: event.endDate ?? "",
      startTime: event.startTime ?? "",
      endTime: event.endTime ?? "",
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

  const salonName = (id?: string) => allSalons.find((s) => s.id === id)?.name ?? "Salón";

  const renderEventCard = (e: CalendarEvent) => (
    <View key={e.id} style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{e.title}</Text>
        <View style={styles.scopeBadge}>
          <Text style={styles.scopeBadgeText}>{e.scope === "global" ? "Global" : salonName(e.salonId)}</Text>
        </View>
      </View>
      {e.startTime ? (
        <Text style={styles.eventMeta}>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ""}</Text>
      ) : (
        <Text style={styles.eventMeta}>Todo el día</Text>
      )}
      {e.recurrence === "range" ? (
        <Text style={styles.eventMeta}>{formatCLDate(e.date)} – {formatCLDate(e.endDate || e.date)}</Text>
      ) : null}
      {e.recurrence === "daily" ? <Text style={styles.eventMeta}>Se repite todos los días</Text> : null}
      {e.description ? <Text style={styles.eventMeta}>{e.description}</Text> : null}
      {canManageEvent(e) ? (
        <View style={styles.actionsRow}>
          <Pressable onPress={() => startEdit(e)}><Text style={styles.actionLink}>Editar</Text></Pressable>
          <Pressable onPress={() => handleDelete(e.id)}><Text style={styles.actionDanger}>Eliminar</Text></Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Calendario" }]} />

        {/* Vista mensual / diaria */}
        <View style={styles.viewToggleRow}>
          {(["mensual", "diaria"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setViewMode(v)}
              style={[styles.viewToggleChip, viewMode === v && styles.viewToggleChipActive]}
            >
              <Text style={[styles.viewToggleText, viewMode === v && styles.viewToggleTextActive]}>
                {v === "mensual" ? "Vista mensual" : "Vista diaria"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Filtro por salón / global */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filterChips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[styles.filterChip, filter === chip.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === chip.key && styles.filterTextActive]}>{chip.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Encabezado compartido: fecha seleccionada + acción de agregar */}
        <View style={styles.selectedHeader}>
          {viewMode === "mensual" ? (
            <Text style={styles.selectedTitle}>{formatCLDate(selectedDate)}</Text>
          ) : (
            <Text style={styles.selectedTitle}>Actividades</Text>
          )}
          {canEdit ? (
            <Pressable onPress={() => (showForm ? resetForm() : openNewForm())} style={styles.addButton}>
              <Text style={styles.addButtonText}>{showForm ? "Cancelar" : "+ Agregar"}</Text>
            </Pressable>
          ) : null}
        </View>

        {showForm && canEdit ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? "Editar evento" : "Nuevo evento"}</Text>
            <TextInput value={draft.title} onChangeText={(v) => setDraft({ ...draft, title: v })} placeholder="Título" style={styles.input} />

            <View style={styles.scopeRow}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setDraft({ ...draft, recurrence: opt.key })}
                  style={[styles.scopeChip, draft.recurrence === opt.key && styles.scopeChipActive]}
                >
                  <Text style={[styles.scopeText, draft.recurrence === opt.key && styles.scopeTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            {draft.recurrence !== "daily" ? (
              <DateField
                value={draft.date}
                onChange={(v) => setDraft({ ...draft, date: v })}
                placeholder={draft.recurrence === "range" ? "Desde (DD-MM-AAAA)" : "Fecha (DD-MM-AAAA)"}
              />
            ) : null}
            {draft.recurrence === "range" ? (
              <DateField value={draft.endDate ?? ""} onChange={(v) => setDraft({ ...draft, endDate: v })} placeholder="Hasta (DD-MM-AAAA)" />
            ) : null}

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Hora inicio</Text>
                <TimeField value={draft.startTime ?? ""} onChange={(v) => setDraft({ ...draft, startTime: v })} placeholder="Inicio" />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Hora fin</Text>
                <TimeField value={draft.endTime ?? ""} onChange={(v) => setDraft({ ...draft, endTime: v })} placeholder="Fin" />
              </View>
            </View>

            <TextInput value={draft.description ?? ""} onChangeText={(v) => setDraft({ ...draft, description: v })} placeholder="Descripción" style={styles.input} />
            {isAdmin ? (
              <View style={styles.scopeRow}>
                {(["global", "salon"] as const).map((s) => (
                  <Pressable key={s} onPress={() => setDraft({ ...draft, scope: s })} style={[styles.scopeChip, draft.scope === s && styles.scopeChipActive]}>
                    <Text style={[styles.scopeText, draft.scope === s && styles.scopeTextActive]}>{s === "global" ? "Global" : "Por salón"}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {draft.scope === "salon" ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeRow}>
                {(isAdmin ? allSalons : visibleSalons).map((s) => (
                  <Pressable key={s.id} onPress={() => setDraft({ ...draft, salonId: s.id })} style={[styles.scopeChip, draft.salonId === s.id && styles.scopeChipActive]}>
                    <Text style={[styles.scopeText, draft.salonId === s.id && styles.scopeTextActive]}>{s.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </Pressable>
          </View>
        ) : null}

        {viewMode === "mensual" ? (
          <>
            {/* Navegación de mes / año */}
            <View style={styles.monthNav}>
              <Pressable onPress={() => changeYear(-1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>«</Text>
              </Pressable>
              <Pressable onPress={() => changeMonth(-1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{MONTHS_ES[month]} {year}</Text>
              <Pressable onPress={() => changeMonth(1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>›</Text>
              </Pressable>
              <Pressable onPress={() => changeYear(1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>»</Text>
              </Pressable>
            </View>

            {/* Grilla del mes, estilo calendario de papel cuadriculado */}
            <View style={styles.calendarPaper}>
              <View style={styles.weekRow}>
                {WEEKDAYS_ES.map((w, i) => (
                  <View
                    key={`${w}-${i}`}
                    style={[
                      styles.weekdayCell,
                      i === 5 && styles.weekdayCellSaturday,
                      i === 6 && styles.weekdayCellSunday,
                      i === 6 && styles.weekdayCellLast,
                    ]}
                  >
                    <Text style={[styles.weekday, i === 5 && styles.weekdaySaturday, i === 6 && styles.weekdaySunday]}>{w}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((day, idx) => {
                  const column = idx % 7;
                  const isLastColumn = column === 6;
                  const isWeekend = column === 5 || column === 6;
                  if (day === null) {
                    return (
                      <View
                        key={`empty-${idx}`}
                        style={[styles.dayCell, isLastColumn && styles.dayCellLastColumn, isWeekend && styles.dayCellWeekend]}
                      />
                    );
                  }
                  const iso = toISODate(new Date(year, month, day));
                  const dayEvents = filteredEvents.filter((e) => eventOccursOnDate(e, iso));
                  const isSelected = iso === selectedDate;
                  const isToday = iso === todayISODate();
                  const visibleEvents = dayEvents.slice(0, 2);
                  const extraCount = dayEvents.length - visibleEvents.length;
                  return (
                    <Pressable
                      key={iso}
                      style={[
                        styles.dayCell,
                        isLastColumn && styles.dayCellLastColumn,
                        isWeekend && styles.dayCellWeekend,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => setSelectedDate(iso)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          column === 6 && styles.dayTextSunday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                      {visibleEvents.map((e) => (
                        <View key={e.id} style={styles.dayEventRow}>
                          {e.startTime ? (
                            <View
                              style={[
                                styles.dayEventTimeChip,
                                e.scope === "global" ? styles.dayEventTimeChipGlobal : styles.dayEventTimeChipSalon,
                                isSelected && styles.dayEventTimeChipSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayEventTimeChipText,
                                  e.scope === "global" ? styles.dayEventTimeChipTextGlobal : styles.dayEventTimeChipTextSalon,
                                  isSelected && styles.dayEventTimeChipTextSelected,
                                ]}
                              >
                                {e.startTime}{e.endTime ? `–${e.endTime}` : ""}
                              </Text>
                            </View>
                          ) : null}
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.dayEventTitle,
                              e.scope === "global" ? styles.dayEventTitleGlobal : styles.dayEventTitleSalon,
                              isSelected && styles.dayEventTitleSelected,
                            ]}
                          >
                            {e.title}
                          </Text>
                        </View>
                      ))}
                      {extraCount > 0 ? (
                        <Text style={[styles.dayEventMore, isSelected && styles.dayEventTitleSelected]}>+{extraCount} más</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {selectedDayEvents.length === 0 ? (
              <Text style={styles.empty}>No hay eventos para este día.</Text>
            ) : (
              selectedDayEvents.map(renderEventCard)
            )}
          </>
        ) : (
          <>
            {/* Navegación de día */}
            <View style={styles.monthNav}>
              <Pressable onPress={() => changeSelectedDay(-1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{formatCLDate(selectedDate)}</Text>
              <Pressable onPress={() => changeSelectedDay(1)} style={styles.navButton} hitSlop={8}>
                <Text style={styles.navButtonText}>›</Text>
              </Pressable>
            </View>

            {allDayEvents.length > 0 ? (
              <View style={styles.allDaySection}>
                <Text style={styles.allDayLabel}>Todo el día</Text>
                {allDayEvents.map(renderEventCard)}
              </View>
            ) : null}

            <View style={styles.hourList}>
              {HOURS.map((h) => {
                const hourEvents = timedEvents.filter((e) => Number((e.startTime ?? "0:0").split(":")[0]) === h);
                return (
                  <View key={h} style={styles.hourRow}>
                    <Text style={styles.hourLabel}>{h.toString().padStart(2, "0")}:00</Text>
                    <View style={styles.hourContent}>{hourEvents.map(renderEventCard)}</View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  viewToggleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  viewToggleChip: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 8, alignItems: "center", backgroundColor: colors.card },
  viewToggleChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  viewToggleText: { fontSize: 13, color: colors.slate, fontWeight: "700" },
  viewToggleTextActive: { color: "#fff" },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.paper },
  filterChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  filterText: { fontSize: 13, color: colors.slate, fontWeight: "600" },
  filterTextActive: { color: colors.tealDark },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.sm },
  navButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  navButtonText: { fontSize: 18, color: colors.teal, fontWeight: "700" },
  monthTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, textTransform: "capitalize", minWidth: 140, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  weekday: { fontSize: 11, color: colors.slate, fontWeight: "700" },
  weekdaySaturday: { color: colors.tealDark },
  weekdaySunday: { color: colors.danger },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
    backgroundColor: colors.paper,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  weekdayCellSaturday: { backgroundColor: colors.tealTint },
  weekdayCellSunday: { backgroundColor: colors.dangerTint },
  weekdayCellLast: { borderRightWidth: 0 },
  calendarPaper: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    overflow: "hidden",
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 62,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: "stretch",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  dayCellLastColumn: { borderRightWidth: 0 },
  dayCellWeekend: { backgroundColor: colors.paper },
  dayCellToday: { backgroundColor: colors.tealTint },
  dayCellSelected: { backgroundColor: colors.teal },
  dayText: { fontSize: 13, color: colors.ink, textAlign: "center" },
  dayTextSunday: { color: colors.danger },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  dayEventTitle: { fontSize: 9, fontWeight: "600", flexShrink: 1 },
  dayEventRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  dayEventTimeChip: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: radius.pill },
  dayEventTimeChipGlobal: { backgroundColor: colors.amberTint },
  dayEventTimeChipSalon: { backgroundColor: colors.tealTint },
  dayEventTimeChipSelected: { backgroundColor: "rgba(255,255,255,0.25)" },
  dayEventTimeChipText: { fontSize: 8, fontWeight: "700" },
  dayEventTimeChipTextGlobal: { color: colors.amber },
  dayEventTimeChipTextSalon: { color: colors.tealDark },
  dayEventTimeChipTextSelected: { color: "#fff" },
  dayEventTitleGlobal: { color: colors.amber },
  dayEventTitleSalon: { color: colors.tealDark },
  dayEventTitleSelected: { color: "#fff" },
  dayEventMore: { fontSize: 9, color: colors.slate, marginTop: 1, textAlign: "center" },
  selectedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  selectedTitle: { fontSize: 14, fontWeight: "700", color: colors.tealDark, textTransform: "capitalize" },
  addButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 14 },
  addButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  formCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  formTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  scopeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  scopeChip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  scopeChipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  scopeText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  scopeTextActive: { color: colors.tealDark },
  timeRow: { flexDirection: "row", gap: spacing.sm },
  timeField: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.slate, fontWeight: "600", marginBottom: 4 },
  saveButton: { backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "700" },
  allDaySection: { marginBottom: spacing.md },
  allDayLabel: { fontSize: 12, fontWeight: "700", color: colors.tealDark, marginBottom: spacing.xs },
  hourList: { borderTopWidth: 1, borderTopColor: colors.line },
  hourRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: spacing.xs, minHeight: 44 },
  hourLabel: { width: 56, fontSize: 11, color: colors.slate, fontWeight: "600", paddingTop: 4 },
  hourContent: { flex: 1 },
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
