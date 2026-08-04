import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { createThread, listenThreads, ThreadDraft } from "../../../src/data/chatRepository";
import { listenParticipants, listenProfiles } from "../../../src/data/adminRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { ChatThread, Person, ProfileRecord } from "../../../src/types";
import { showAlert } from "../../../src/utils/alert";
import Breadcrumb from "../../../src/components/Breadcrumb";

const SCOPES = ["global", "salon", "participant"] as const;

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

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<ThreadDraft>({
    title: "",
    scope: "global",
    memberIds: [],
  });
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsubProfiles = listenProfiles(membership.organizationId, setProfiles);
    const unsubParticipants = listenParticipants(membership.organizationId, setParticipants);
    return () => {
      unsubProfiles();
      unsubParticipants();
    };
  }, [membership?.organizationId]);

  // el id del campo "apoderado" varía según la plantilla de rubro y datos antiguos de demo
  const guardianName = (p: Person) =>
    String(
      p.baseData?.apoderado_principal ??
        p.baseData?.nombre_apoderado ??
        p.baseData?.apoderado ??
        p.baseData?.contacto_emergencia_nombre ??
        ""
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

  const searchResults = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return [];
    return memberOptions
      .filter((m) => !selectedUids.has(m.uid) && m.searchText.includes(term))
      .slice(0, 6);
  }, [memberOptions, memberSearch, selectedUids]);

  const addMember = (option: MemberOption) => {
    setSelectedMembers((prev) => [...prev, option]);
    setMemberSearch("");
  };

  const removeMember = (uid: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.uid !== uid));
  };

  // Cuando el admin elige un participante en el scope "participant", vincula el hilo
  // y agrega automáticamente al apoderado como miembro si tiene cuenta vinculada.
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
    return participants
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [participants, participantSearch, selectedParticipantId]);

  useEffect(() => {
    if (!membership?.organizationId || !user) return;
    return listenThreads(membership.organizationId, user.uid, role, setThreads);
  }, [membership?.organizationId, user?.uid, role]);

  const handleCreate = async () => {
    if (!membership?.organizationId || !user) return;
    if (!draft.title.trim()) {
      showAlert("Faltan datos", "Ingresa un título para el hilo.");
      return;
    }
    try {
      // El creador debe quedar como miembro, si no queda sin acceso de lectura al hilo que acaba de crear.
      const memberIds = Array.from(new Set([...selectedMembers.map((m) => m.uid), user.uid]));
      const threadId = await createThread(membership.organizationId, { ...draft, memberIds });
      setDraft({ title: "", scope: "global", memberIds: [] });
      setSelectedMembers([]);
      setMemberSearch("");
      setSelectedParticipantId(null);
      setParticipantSearch("");
      setShowForm(false);
      router.push(`/chat/${threadId}` as any);
    } catch (e: any) {
      showAlert("No se pudo crear", e?.message ?? "Intenta de nuevo.");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Chat" }]} />

      {showForm && canCreate ? (
        <View style={styles.formCard}>
          <TextInput
            value={draft.title}
            onChangeText={(v) => setDraft({ ...draft, title: v })}
            placeholder="Título del Chat"
            style={styles.input}
          />
          <View style={styles.scopeRow}>
            {SCOPES.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  setDraft((d) => ({ ...d, scope: s, participantId: undefined }));
                  setSelectedParticipantId(null);
                  setParticipantSearch("");
                }}
                style={[styles.chip, draft.scope === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, draft.scope === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          {draft.scope === "participant" ? (
            <>
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
              {participantSearchResults.length > 0 ? (
                <View style={styles.searchResults}>
                  {participantSearchResults.map((p) => (
                    <Pressable key={p.id} onPress={() => handleSelectParticipant(p)} style={styles.searchResultRow}>
                      <Text style={styles.searchResultText}>{p.name}</Text>
                      <Text style={styles.searchResultKind}>{p.linkedUid ? "Con apoderado" : "Sin cuenta"}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : participantSearch.trim().length > 0 && !selectedParticipantId ? (
                <Text style={styles.searchEmpty}>Sin resultados.</Text>
              ) : null}
            </>
          ) : null}
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Buscar profesional, participante o apoderado"
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
          <View style={styles.formActions}>
            <Pressable onPress={handleCreate} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Crear hilo</Text>
            </Pressable>
            <Pressable onPress={() => {
              setShowForm(false);
              setSelectedParticipantId(null);
              setParticipantSearch("");
              setDraft({ title: "", scope: "global", memberIds: [] });
              setSelectedMembers([]);
            }} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          canCreate ? (
            <Pressable onPress={() => setShowForm((v) => !v)} style={styles.newThreadButton}>
              <Text style={styles.newThreadButtonText}>+ Nuevo hilo</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No hay hilos de conversación disponibles.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.threadCard}
            onPress={() => router.push(`/chat/${item.id}` as any)}
          >
            <Text style={styles.threadTitle}>{item.title}</Text>
            <View style={styles.threadMeta}>
              <View style={styles.scopePill}>
                <Text style={styles.scopePillText}>{item.scope}</Text>
              </View>
              {item.salonName ? (
                <Text style={styles.salonName}>{item.salonName}</Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  list: { padding: spacing.lg },
  formCard: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    padding: spacing.lg,
  },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, marginBottom: spacing.sm },
  searchResults: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, marginTop: -spacing.xs, marginBottom: spacing.sm, overflow: "hidden", backgroundColor: colors.card },
  searchResultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  searchResultText: { fontSize: 13, color: colors.ink, fontWeight: "600", flexShrink: 1 },
  searchResultKind: { fontSize: 11, color: colors.slate },
  searchEmpty: { fontSize: 12, color: colors.slate, marginBottom: spacing.sm },
  memberChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.tealTint, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10, maxWidth: 200 },
  memberChipText: { fontSize: 12, color: colors.tealDark, fontWeight: "600", flexShrink: 1 },
  memberChipRemove: { fontSize: 14, color: colors.tealDark, fontWeight: "700" },
  scopeRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  chipTextActive: { color: colors.tealDark },
  formActions: { flexDirection: "row", gap: spacing.sm },
  primaryButton: { flex: 1, backgroundColor: colors.teal, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "700" },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: spacing.sm, alignItems: "center" },
  secondaryButtonText: { color: colors.ink, fontWeight: "600" },
  newThreadButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  newThreadButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  threadCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  threadTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  threadMeta: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" },
  scopePill: { backgroundColor: colors.tealTint, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 8 },
  scopePillText: { fontSize: 11, color: colors.tealDark, fontWeight: "600" },
  salonName: { fontSize: 12, color: colors.slate },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
});
