import React, { useEffect, useState } from "react";
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
import { colors, radius, spacing } from "../../../src/theme";
import { ChatThread } from "../../../src/types";
import { showAlert } from "../../../src/utils/alert";

const SCOPES = ["global", "salon", "participant"] as const;

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
  const [memberInput, setMemberInput] = useState("");

  useEffect(() => {
    if (!membership?.organizationId || !user) return;
    return listenThreads(membership.organizationId, user.uid, role, setThreads);
  }, [membership?.organizationId, user?.uid, role]);

  const handleCreate = async () => {
    if (!membership?.organizationId) return;
    if (!draft.title.trim()) {
      showAlert("Faltan datos", "Ingresa un título para el hilo.");
      return;
    }
    try {
      await createThread(membership.organizationId, draft);
      setDraft({ title: "", scope: "global", memberIds: [] });
      setMemberInput("");
      setShowForm(false);
    } catch (e: any) {
      showAlert("No se pudo crear", e?.message ?? "Intenta de nuevo.");
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Chat" }} />

      {showForm && canCreate ? (
        <View style={styles.formCard}>
          <TextInput
            value={draft.title}
            onChangeText={(v) => setDraft({ ...draft, title: v })}
            placeholder="Título del hilo"
            style={styles.input}
          />
          <View style={styles.scopeRow}>
            {SCOPES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setDraft({ ...draft, scope: s })}
                style={[styles.chip, draft.scope === s && styles.chipActive]}
              >
                <Text style={[styles.chipText, draft.scope === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={memberInput}
            onChangeText={setMemberInput}
            placeholder="UID de miembros separados por coma"
            style={styles.input}
            onBlur={() =>
              setDraft({
                ...draft,
                memberIds: memberInput
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              })
            }
          />
          <View style={styles.formActions}>
            <Pressable onPress={handleCreate} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Crear hilo</Text>
            </Pressable>
            <Pressable onPress={() => setShowForm(false)} style={styles.secondaryButton}>
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
