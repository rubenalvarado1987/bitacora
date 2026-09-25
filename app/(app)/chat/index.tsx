import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { useAuth } from "../../../src/context/AuthContext";
import {
  createThread,
  listenClosedThreads,
  listenThreads,
  ThreadDraft,
} from "../../../src/data/chatRepository";
import {
  listenMyProfile,
  listenParticipants,
  listenProfiles,
  listenSalons,
} from "../../../src/data/adminRepository";
import { db } from "../../../src/firebase";
import { colors, radius, spacing } from "../../../src/theme";
import { ChatThread, Person, ProfileRecord, Salon } from "../../../src/types";
import { showAlert } from "../../../src/utils/alert";
import Breadcrumb from "../../../src/components/Breadcrumb";
import AppIcon from "../../../src/components/AppIcon";

function useGridColumns() {
  const { width } = useWindowDimensions();
  if (width >= 860) return 4;
  if (width >= 600) return 3;
  if (width >= 400) return 2;
  return 1;
}

const SCOPES = ["global", "salon", "participant"] as const;
const SCOPE_LABELS: Record<typeof SCOPES[number], string> = {
  global: "Global",
  salon: "Por salón",
  participant: "Por participante",
};

interface MemberOption {
  uid: string;
  label: string;
  kind: "profesional" | "participante";
}

export default function ChatIndexScreen() {
  const { membership, user } = useAuth();
  const router = useRouter();
  const role = membership?.role ?? "lector";
  const canCreate = role === "admin" || role === "editor" || role === "profesional";
  const canClose = role === "admin" || role === "profesional";

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [closedThreads, setClosedThreads] = useState<ChatThread[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ThreadDraft>({
    title: "",
    scope: "global",
    memberIds: [],
  });
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [myProfile, setMyProfile] = useState<ProfileRecord | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [latestMessageMsByThread, setLatestMessageMsByThread] = useState<Record<string, number | null>>({});
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type?: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsubProfiles = listenProfiles(membership.organizationId, setProfiles);
    const unsubParticipants = listenParticipants(membership.organizationId, setParticipants);
    const unsubSalons = listenSalons(membership.organizationId, setSalons);
    return () => { unsubProfiles(); unsubParticipants(); unsubSalons(); };
  }, [membership?.organizationId]);

  // Carga el perfil del profesional para saber sus salones asignados
  useEffect(() => {
    if (!membership?.organizationId || !membership.uid || role !== "profesional") return;
    return listenMyProfile(membership.organizationId, membership.uid, setMyProfile);
  }, [membership?.organizationId, membership?.uid, role]);

  useEffect(() => {
    if (!membership?.organizationId || !user) return;
    return listenThreads(membership.organizationId, user.uid, role, setThreads);
  }, [membership?.organizationId, user?.uid, role]);

  useEffect(() => {
    if (!membership?.organizationId || !user) return;
    return listenClosedThreads(membership.organizationId, user.uid, role, setClosedThreads);
  }, [membership?.organizationId, user?.uid, role]);

  useEffect(() => {
    if (!membership?.organizationId) {
      setLatestMessageMsByThread({});
      return;
    }
    const unsubs: Array<() => void> = [];
    const activeIds = new Set(threads.map((t) => t.id));
    setLatestMessageMsByThread((prev) => {
      const next: Record<string, number | null> = {};
      for (const [threadId, value] of Object.entries(prev)) {
        if (activeIds.has(threadId)) next[threadId] = value;
      }
      return next;
    });
    threads.forEach((thread) => {
      const q = query(
        collection(db, "organizations", membership.organizationId!, "chatThreads", thread.id, "messages"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const unsub = onSnapshot(q, (snap) => {
        const latest = snap.docs[0]?.data()?.createdAt;
        const latestMs = typeof latest?.toMillis === "function" ? latest.toMillis() : null;
        setLatestMessageMsByThread((prev) => ({ ...prev, [thread.id]: latestMs }));
      }, () => {
        setLatestMessageMsByThread((prev) => ({ ...prev, [thread.id]: null }));
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach((u) => u()); };
  }, [membership?.organizationId, threads]);

  const getTimestampMs = (value: any): number | null => {
    if (!value) return null;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (value instanceof Date) return value.getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  };

  const unreadThreadIds = useMemo(() => {
    if (!user) return new Set<string>();
    const ids = new Set<string>();
    threads.forEach((thread) => {
      const latestMs = latestMessageMsByThread[thread.id] ?? null;
      if (!latestMs) return;
      const readMs = getTimestampMs(thread.readBy?.[user.uid]);
      if (!readMs || latestMs > readMs) ids.add(thread.id);
    });
    return ids;
  }, [threads, latestMessageMsByThread, user]);

  // Salones disponibles según rol
  const availableSalons = useMemo<Salon[]>(() => {
    if (role === "admin" || role === "editor") return salons;
    if (role === "profesional" && myProfile) {
      const mySalonIds = new Set(myProfile.salonIds ?? []);
      return salons.filter((s) => mySalonIds.has(s.id) || s.professionalIds.includes(myProfile.id));
    }
    return [];
  }, [role, salons, myProfile]);

  // Participantes disponibles según rol
  const availableParticipants = useMemo<Person[]>(() => {
    if (role === "admin" || role === "editor") return participants;
    if (role === "profesional" && myProfile) {
      const mySalonIds = new Set(myProfile.salonIds ?? []);
      return participants.filter((p) => (p.salonIds ?? []).some((sid) => mySalonIds.has(sid)));
    }
    return [];
  }, [role, participants, myProfile]);

  const guardianName = (p: Person) =>
    String(
      p.baseData?.apoderado_principal ??
      p.baseData?.nombre_apoderado ??
      p.baseData?.apoderado ??
      p.baseData?.contacto_emergencia_nombre ?? ""
    ).trim();

  const memberOptions = useMemo<(MemberOption & { searchText: string })[]>(() => {
    const fromProfiles = profiles
      .filter((p) => p.linkedUid)
      .map((p) => ({
        uid: p.linkedUid as string,
        label: p.displayName,
        kind: "profesional" as const,
        searchText: p.displayName.toLowerCase(),
      }));
    const fromParticipants = participants
      .filter((p) => p.linkedUid)
      .map((p) => {
        const guardian = guardianName(p);
        return {
          uid: p.linkedUid as string,
          label: guardian ? `${p.name} (${guardian})` : p.name,
          kind: "participante" as const,
          searchText: `${p.name} ${guardian}`.toLowerCase(),
        };
      });
    return [...fromProfiles, ...fromParticipants];
  }, [profiles, participants]);

  const selectedUids = useMemo(() => new Set(selectedMembers.map((m) => m.uid)), [selectedMembers]);

  // Para scope "participant", admin puede agregar profesionales y participantes;
  // profesional solo puede agregar participantes.
  const memberOptionsForScope = useMemo(() => {
    if (draft.scope === "participant" && role === "profesional") {
      return memberOptions.filter((m) => m.kind === "participante");
    }
    return memberOptions;
  }, [memberOptions, draft.scope, role]);

  const searchResults = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return [];
    return memberOptionsForScope
      .filter((m) => !selectedUids.has(m.uid) && m.searchText.includes(term))
      .slice(0, 6);
  }, [memberOptionsForScope, memberSearch, selectedUids]);

  const addMember = (option: MemberOption) => {
    setSelectedMembers((prev) => [...prev, option]);
    setMemberSearch("");
  };

  // Auto-poblar miembros al seleccionar un salón
  const handleSelectSalon = (salon: Salon) => {
    setSelectedSalonId(salon.id);
    setDraft((d) => ({ ...d, salonId: salon.id, salonName: salon.name }));

    const members: MemberOption[] = [];

    // Profesionales del salón (salon.professionalIds son IDs de ProfileRecord)
    for (const profileId of salon.professionalIds ?? []) {
      const profile = profiles.find((p) => p.id === profileId);
      if (profile?.linkedUid) {
        members.push({ uid: profile.linkedUid, label: profile.displayName, kind: "profesional" });
      }
    }

    // Participantes del salón (salon.participantIds son IDs de Person)
    for (const personId of salon.participantIds ?? []) {
      const person = participants.find((p) => p.id === personId);
      if (person?.linkedUid) {
        const guardian = guardianName(person);
        const label = guardian ? `${person.name} (${guardian})` : person.name;
        members.push({ uid: person.linkedUid, label, kind: "participante" });
      }
    }

    // Deduplicar por uid
    const unique = members.filter((v, i, arr) => arr.findIndex((x) => x.uid === v.uid) === i);
    setSelectedMembers(unique);
  };

  const removeMember = (uid: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  // Agrega TODOS los usuarios con cuenta vinculada
  const handleAddAll = () => {
    const all: MemberOption[] = [
      ...profiles
        .filter((p) => p.linkedUid)
        .map((p) => ({ uid: p.linkedUid as string, label: p.displayName, kind: "profesional" as const })),
      ...participants
        .filter((p) => p.linkedUid)
        .map((p) => {
          const guardian = guardianName(p);
          return { uid: p.linkedUid as string, label: guardian ? `${p.name} (${guardian})` : p.name, kind: "participante" as const };
        }),
    ];
    const unique = all.filter((v, i, arr) => arr.findIndex((x) => x.uid === v.uid) === i);
    setSelectedMembers(unique);
    setMemberSearch("");
  };

  // Participante individual para scope "participant"
  const handleSelectParticipant = (p: Person) => {
    setSelectedParticipantId(p.id);
    setParticipantSearch(p.name);
    setDraft((d) => ({ ...d, participantId: p.id }));
    if (p.linkedUid) {
      const guardian = guardianName(p);
      const label = guardian ? `${p.name} (${guardian})` : p.name;
      setSelectedMembers((prev) => {
        if (prev.some((m) => m.uid === p.linkedUid)) return prev;
        return [...prev, { uid: p.linkedUid as string, label, kind: "participante" }];
      });
    }
  };

  const participantSearchResults = useMemo(() => {
    const term = participantSearch.trim().toLowerCase();
    if (!term || selectedParticipantId) return [];
    return availableParticipants
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [availableParticipants, participantSearch, selectedParticipantId]);

  const resetForm = () => {
    setShowForm(false);
    setDraft({ title: "", scope: "global", memberIds: [] });
    setSelectedMembers([]);
    setMemberSearch("");
    setSelectedParticipantId(null);
    setParticipantSearch("");
    setSelectedSalonId(null);
  };

  const handleCreate = async () => {
    if (!membership?.organizationId || !user) return;
    if (!draft.title.trim()) {
      setAlertModal({ title: "Faltan datos", message: "Ingresa un título para el hilo." });
      return;
    }
    if (draft.scope === "salon" && !selectedSalonId) {
      setAlertModal({ title: "Faltan datos", message: "Selecciona un salón." });
      return;
    }
    try {
      // Admin ve todos los hilos sin necesidad de estar en memberIds.
      // Para otros roles, el creador debe quedar como miembro para poder acceder.
      const creatorUids = role === "admin" ? [] : [user.uid];
      const memberIds = Array.from(new Set([...selectedMembers.map((m) => m.uid), ...creatorUids]));
      await createThread(membership.organizationId, { ...draft, memberIds });
      resetForm();
      setAlertModal({ title: "¡Hilo creado!", message: "El hilo de conversación fue creado con éxito y ya está disponible para todos los participantes.", type: "success" });
    } catch (e: any) {
      setAlertModal({ title: "No se pudo crear", message: e?.message ?? "Intenta de nuevo." });
    }
  };

  const numColumns = useGridColumns();

  const SCOPE_ORDER: Record<string, number> = { global: 0, salon: 1, participant: 2 };
  const sortedThreads = useMemo(
    () => [...threads].sort((a, b) => {
      const s = (SCOPE_ORDER[a.scope] ?? 3) - (SCOPE_ORDER[b.scope] ?? 3);
      return s !== 0 ? s : a.title.localeCompare(b.title);
    }),
    [threads]
  );

  const memberLabels = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((p) => { if (p.linkedUid) map.set(p.linkedUid, p.displayName); });
    participants.forEach((p) => { if (p.linkedUid) map.set(p.linkedUid, p.displayName ?? p.name); });
    return map;
  }, [profiles, participants]);

  const DEFAULT_SALON_COLOR = "#1F6F6B";
  const getThreadColor = (item: ChatThread) => {
    if (item.scope === "global") return colors.amber;
    if (item.scope === "salon") {
      const salon = salons.find((s) => s.id === item.salonId);
      return salon?.color || DEFAULT_SALON_COLOR;
    }
    return colors.slate; // participant → neutro
  };

  const renderThreadCard = (item: ChatThread, closed = false) => {
    const isUnread = unreadThreadIds.has(item.id);
    const accent = closed ? colors.slate : getThreadColor(item);
    const tint = item.scope === "participant" || closed ? "transparent" : accent + "18";
    return (
      <Pressable
        key={item.id}
        style={[
          styles.threadCard,
          { borderLeftWidth: 4, borderLeftColor: accent, backgroundColor: tint || colors.card },
          isUnread && styles.threadCardUnread,
          closed && styles.threadCardClosed,
        ]}
        onPress={() => router.push(`/chat/${item.id}` as any)}
      >
        <View style={styles.threadTitleRow}>
          <Text style={[styles.threadTitle, closed && styles.threadTitleClosed]}>{item.title}</Text>
          <View style={styles.threadBadges}>
            {isUnread && !closed ? (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>Nuevo</Text>
              </View>
            ) : null}
            {closed ? (
              <View style={styles.closedPill}>
                <Text style={styles.closedPillText}>Cerrado</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.threadMeta}>
          <View style={[styles.scopePill, !closed && item.scope !== "participant" && { backgroundColor: accent + "28" }]}>
            <Text style={[styles.scopePillText, !closed && item.scope !== "participant" && { color: accent }]}>
              {SCOPE_LABELS[item.scope as typeof SCOPES[number]] ?? item.scope}
            </Text>
          </View>
          {item.salonName ? <Text style={styles.salonName}>{item.salonName}</Text> : null}
        </View>
        {closed ? (
          <View style={styles.closedCardExtra}>
            <View style={styles.closedCardDates}>
              {item.createdAt ? (
                <Text style={styles.closedCardDateText}>
                  <Text style={styles.closedCardDateLabel}>Creado </Text>
                  {formatDate(item.createdAt)}
                </Text>
              ) : null}
              {item.closedAt ? (
                <Text style={styles.closedCardDateText}>
                  <Text style={styles.closedCardDateLabel}>Cerrado </Text>
                  {formatDate(item.closedAt)}
                </Text>
              ) : null}
            </View>
            {item.memberIds.length > 0 ? (() => {
              const names = item.memberIds.map((uid) => memberLabels.get(uid)).filter(Boolean);
              return names.length > 0 ? (
                <Text style={styles.closedCardParticipants} numberOfLines={2}>
                  <Text style={styles.closedCardDateLabel}>Participantes: </Text>
                  {names.join(", ")}
                </Text>
              ) : null;
            })() : null}
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Chat" }]} />
      </View>

      <Modal
        visible={showForm && canCreate}
        transparent
        animationType="fade"
        onRequestClose={resetForm}
      >
        <Pressable style={styles.modalOverlay} onPress={resetForm}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="chat-plus-outline" size={20} color={colors.teal} />
                <Text style={styles.modalTitle}>Nuevo hilo</Text>
              </View>
              <Pressable onPress={resetForm} hitSlop={10}>
                <AppIcon name="close" size={22} color={colors.slate} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent} keyboardShouldPersistTaps="handled">
          <TextInput
            value={draft.title}
            onChangeText={(v) => setDraft({ ...draft, title: v })}
            placeholder="Título del hilo"
            style={styles.input}
          />

          {/* Selector de scope */}
          <Text style={styles.label}>Tipo de hilo</Text>
          <View style={styles.scopeRow}>
            {SCOPES.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setDraft((d) => ({ ...d, scope: s, participantId: undefined, salonId: undefined, salonName: undefined }));
                  setSelectedParticipantId(null);
                  setParticipantSearch("");
                  setSelectedSalonId(null);
                  setSelectedMembers([]);
                }}
                style={[styles.chip, draft.scope === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, draft.scope === s && styles.chipTextActive]}>{SCOPE_LABELS[s]}</Text>
              </Pressable>
            ))}
          </View>

          {/* Picker de salón (solo para scope salon) */}
          {draft.scope === "salon" ? (
            <View>
              <Text style={styles.label}>Salón</Text>
              {availableSalons.length === 0 ? (
                <Text style={styles.emptyHint}>No hay salones disponibles.</Text>
              ) : (
                <View style={styles.salonChipsRow}>
                  {availableSalons.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => handleSelectSalon(s)}
                      style={[styles.chip, selectedSalonId === s.id && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, selectedSalonId === s.id && styles.chipTextActive]}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {/* Picker de participante (solo para scope participant) */}
          {draft.scope === "participant" ? (
            <View>
              <Text style={styles.label}>Participante</Text>
              <TextInput
                value={participantSearch}
                onChangeText={(v) => {
                  setParticipantSearch(v);
                  if (selectedParticipantId) {
                    setSelectedParticipantId(null);
                    setDraft((d) => ({ ...d, participantId: undefined }));
                  }
                }}
                placeholder="Buscar participante…"
                style={styles.input}
                editable={!selectedParticipantId}
              />
              {selectedParticipantId ? (
                <Pressable onPress={() => { setSelectedParticipantId(null); setParticipantSearch(""); setDraft((d) => ({ ...d, participantId: undefined })); }} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>✕ Limpiar selección</Text>
                </Pressable>
              ) : null}
              {participantSearchResults.length > 0 ? (
                <View style={styles.searchResults}>
                  {participantSearchResults.map((p) => (
                    <Pressable key={p.id} onPress={() => handleSelectParticipant(p)} style={styles.searchResultRow}>
                      <Text style={styles.searchResultText}>{p.name}</Text>
                      <Text style={styles.searchResultKind}>{p.linkedUid ? "Con cuenta" : "Sin cuenta"}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : participantSearch.trim().length > 0 && !selectedParticipantId ? (
                <Text style={styles.searchEmpty}>Sin resultados.</Text>
              ) : null}
            </View>
          ) : null}

          {/* Agregar miembros */}
          <>
            <Text style={styles.label}>
              {draft.scope === "participant"
                ? role === "admin"
                  ? "Agregar profesionales y participantes"
                  : "Agregar participantes"
                : "Agregar miembros"}
            </Text>
            {role === "admin" && draft.scope === "global" ? (
              <Pressable onPress={handleAddAll} style={styles.addAllButton}>
                <AppIcon name="account-group" size={14} color={colors.tealDark} />
                <Text style={styles.addAllButtonText}>TODOS (comunidad completa)</Text>
              </Pressable>
            ) : null}
            <TextInput
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder={
                draft.scope === "participant" && role === "profesional"
                  ? "Buscar participante…"
                  : "Buscar profesional o participante…"
              }
              style={styles.input}
            />
            {searchResults.length > 0 ? (
              <View style={styles.searchResults}>
                {searchResults.map((opt) => (
                  <Pressable key={opt.uid} onPress={() => addMember(opt)} style={styles.searchResultRow}>
                    <Text style={styles.searchResultText}>{opt.label}</Text>
                    <Text style={styles.searchResultKind}>{opt.kind === "profesional" ? "Profesional" : "Participante"}</Text>
                  </Pressable>
                ))}
              </View>
            ) : memberSearch.trim().length > 0 ? (
              <Text style={styles.searchEmpty}>Sin resultados.</Text>
            ) : null}
          </>

          {selectedMembers.length > 0 ? (
            <View style={styles.memberChipsRow}>
              {selectedMembers.map((m) => (
                <View key={m.uid} style={styles.memberChip}>
                  <Text style={styles.memberChipText} numberOfLines={1}>{m.label}</Text>
                  <Pressable onPress={() => removeMember(m.uid)} hitSlop={8}>
                    <Text style={styles.memberChipRemove}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

            </ScrollView>

            {/* Footer con acciones */}
            <View style={styles.modalFooter}>
              <Pressable onPress={resetForm} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Crear hilo</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de validación/éxito — renderizado después para quedar encima del form */}
      <Modal
        visible={alertModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAlertModal(null)}>
          <Pressable style={styles.alertCard} onPress={() => {}}>
            <View style={styles.alertIconWrap}>
              {alertModal?.type === "success"
                ? <AppIcon name="check-circle-outline" size={48} color="#16A34A" />
                : <AppIcon name="alert-circle-outline" size={36} color={colors.amber} />}
            </View>
            <Text style={[styles.alertTitle, alertModal?.type === "success" && styles.alertTitleSuccess]}>
              {alertModal?.title}
            </Text>
            <Text style={styles.alertMessage}>{alertModal?.message}</Text>
            <Pressable
              style={[styles.alertButton, alertModal?.type === "success" && styles.alertButtonSuccess]}
              onPress={() => setAlertModal(null)}
            >
              <Text style={styles.alertButtonText}>
                {alertModal?.type === "success" ? "¡Excelente!" : "Entendido"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.list}>
        {unreadThreadIds.size > 0 ? (
          <View style={styles.unreadAlert}>
            <Text style={styles.unreadAlertText}>
              Tienes {unreadThreadIds.size} chat{unreadThreadIds.size === 1 ? "" : "s"} sin leer.
            </Text>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          {canCreate ? (
            <Pressable onPress={() => setShowForm((v) => !v)} style={styles.newThreadButton}>
              <Text style={styles.newThreadButtonText}>+ Nuevo hilo</Text>
            </Pressable>
          ) : null}
          {(canClose || role === "admin") && closedThreads.length > 0 ? (
            <Pressable onPress={() => setShowHistory((v) => !v)} style={styles.historyButton}>
              <AppIcon name="history" size={14} color={colors.slate} />
              <Text style={styles.historyButtonText}>Histórico ({closedThreads.length})</Text>
            </Pressable>
          ) : null}
        </View>

        {sortedThreads.length === 0 ? (
          <Text style={styles.empty}>No hay hilos de conversación activos.</Text>
        ) : (
          <View style={styles.threadGrid}>
            {sortedThreads.map((item) => (
              <View key={item.id} style={[styles.threadGridItem, { width: `${100 / numColumns}%` }]}>
                {renderThreadCard(item, false)}
              </View>
            ))}
          </View>
        )}

        {showHistory && closedThreads.length > 0 ? (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Histórico de conversaciones</Text>
            <View style={styles.threadGrid}>
              {closedThreads.map((item) => (
                <View key={item.id} style={[styles.threadGridItem, { width: `${100 / numColumns}%` }]}>
                  {renderThreadCard(item, true)}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatDate(ts: any): string {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleDateString("es-419", { day: "2-digit", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  list: { padding: spacing.lg },
  // Alert modal
  alertCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  alertIconWrap: { marginBottom: spacing.sm },
  alertTitle: { fontSize: 17, fontWeight: "700", color: colors.ink, textAlign: "center", marginBottom: 6 },
  alertMessage: { fontSize: 13, color: colors.slate, textAlign: "center", marginBottom: spacing.lg, lineHeight: 20 },
  alertButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: "stretch",
    alignItems: "center",
  },
  alertButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  alertTitleSuccess: { color: "#15803D" },
  alertButtonSuccess: { backgroundColor: "#16A34A" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.card,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  modalBody: { flexShrink: 1 },
  modalBodyContent: { padding: spacing.lg },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.sm,
    backgroundColor: colors.paper,
  },
  scopeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, flexWrap: "wrap" },
  salonChipsRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  chipTextActive: { color: colors.tealDark },
  emptyHint: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  clearBtn: { marginBottom: spacing.sm },
  clearBtnText: { fontSize: 12, color: colors.slate },
  addAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: spacing.sm,
  },
  addAllButtonText: { fontSize: 12, color: colors.tealDark, fontWeight: "700" },
  searchResults: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  searchResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchResultText: { fontSize: 13, color: colors.ink, fontWeight: "600", flexShrink: 1 },
  searchResultKind: { fontSize: 11, color: colors.slate },
  searchEmpty: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  memberChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    maxWidth: 200,
  },
  memberChipText: { fontSize: 12, color: colors.tealDark, fontWeight: "600", flexShrink: 1 },
  memberChipRemove: { fontSize: 14, color: colors.tealDark, fontWeight: "700" },
  formActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  primaryButton: { flex: 1, backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  secondaryButtonText: { color: colors.ink, fontWeight: "600" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  newThreadButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  newThreadButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  historyButtonText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  successAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  successAlertText: { color: "#166534", fontSize: 13, fontWeight: "700" },
  unreadAlert: {
    backgroundColor: colors.amberTint,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  unreadAlertText: { color: colors.amber, fontSize: 12, fontWeight: "700" },
  threadGrid: { flexDirection: "row", flexWrap: "wrap" },
  threadGridItem: { padding: spacing.xs },
  threadCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    overflow: "hidden",
  },
  threadCardUnread: { borderColor: colors.amber, backgroundColor: colors.amberTint },
  threadCardClosed: { opacity: 0.7, borderColor: colors.line, backgroundColor: colors.paper },
  threadTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  threadTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, flex: 1 },
  threadTitleClosed: { color: colors.slate, fontWeight: "600" },
  threadBadges: { flexDirection: "row", gap: spacing.xs },
  unreadPill: { backgroundColor: colors.amber, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  unreadPillText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  closedPill: { backgroundColor: colors.line, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: 8 },
  closedPillText: { fontSize: 10, fontWeight: "700", color: colors.slate },
  threadMeta: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" },
  scopePill: { backgroundColor: colors.tealTint, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  scopePillText: { fontSize: 11, color: colors.tealDark, fontWeight: "600" },
  salonName: { fontSize: 12, color: colors.slate },
  historySection: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.md },
  historySectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
  // Closed thread card extras
  closedCardExtra: { marginTop: spacing.sm, gap: 4 },
  closedCardDates: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  closedCardDateText: { fontSize: 11, color: colors.slate },
  closedCardDateLabel: { fontWeight: "700", color: colors.slate },
  closedCardParticipants: { fontSize: 11, color: colors.slate },
});
