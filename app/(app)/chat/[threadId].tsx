import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import {
  listenMessages,
  listenThread,
  markThreadRead,
  sendMessage,
  updateThreadMembers,
} from "../../../src/data/chatRepository";
import { listenParticipants, listenProfiles } from "../../../src/data/adminRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { ChatMessage, ChatThread, Person, ProfileRecord } from "../../../src/types";
import { showAlert } from "../../../src/utils/alert";
import Breadcrumb from "../../../src/components/Breadcrumb";

export default function ChatThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { membership, user } = useAuth();
  const flatRef = useRef<FlatList>(null);

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    if (!membership?.organizationId || !threadId) return;
    return listenThread(membership.organizationId, threadId, setThread);
  }, [membership?.organizationId, threadId]);

  useEffect(() => {
    if (!membership?.organizationId || !threadId) return;
    return listenMessages(membership.organizationId, threadId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [membership?.organizationId, threadId]);

  useEffect(() => {
    if (!membership?.organizationId) return;
    const unsubProfiles = listenProfiles(membership.organizationId, setProfiles);
    const unsubParticipants = listenParticipants(membership.organizationId, setParticipants);
    return () => {
      unsubProfiles();
      unsubParticipants();
    };
  }, [membership?.organizationId]);

  // Marca el hilo como leído por mí cada vez que llegan mensajes nuevos
  useEffect(() => {
    if (!membership?.organizationId || !user || !threadId || messages.length === 0) return;
    markThreadRead(membership.organizationId, threadId, user.uid).catch((e) =>
      console.warn("Error al marcar como leído:", e)
    );
  }, [membership?.organizationId, threadId, user, messages.length]);

  const memberLabels = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((p) => {
      if (p.linkedUid) map.set(p.linkedUid, p.displayName);
    });
    participants.forEach((person) => {
      if (person.linkedUid) map.set(person.linkedUid, person.displayName ?? person.name);
    });
    return map;
  }, [profiles, participants]);

  const canManageMembers = membership?.role === "admin" || membership?.role === "editor" || membership?.role === "profesional";

  // el id del campo "apoderado" varía según la plantilla de rubro y datos antiguos de demo
  const guardianName = (p: Person) =>
    String(
      p.baseData?.apoderado_principal ??
        p.baseData?.nombre_apoderado ??
        p.baseData?.apoderado ??
        p.baseData?.contacto_emergencia_nombre ??
        ""
    ).trim();

  const memberOptions = useMemo(() => {
    const fromProfiles = profiles
      .filter((p) => p.linkedUid)
      .map((p) => ({ uid: p.linkedUid as string, label: p.displayName, searchText: p.displayName.toLowerCase() }));
    const fromParticipants = participants
      .filter((p) => p.linkedUid)
      .map((p) => {
        const guardian = guardianName(p);
        return {
          uid: p.linkedUid as string,
          label: guardian ? `${p.name} (${guardian})` : p.name,
          searchText: `${p.name} ${guardian}`.toLowerCase(),
        };
      });
    return [...fromProfiles, ...fromParticipants];
  }, [profiles, participants]);

  const memberSearchResults = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term || !thread) return [];
    return memberOptions
      .filter((m) => !thread.memberIds.includes(m.uid) && m.searchText.includes(term))
      .slice(0, 6);
  }, [memberOptions, memberSearch, thread]);

  const handleAddMember = async (uid: string) => {
    if (!membership?.organizationId || !threadId || !thread) return;
    try {
      await updateThreadMembers(membership.organizationId, threadId, [...thread.memberIds, uid]);
      setMemberSearch("");
    } catch (e: any) {
      showAlert("No se pudo agregar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!membership?.organizationId || !threadId || !thread) return;
    try {
      await updateThreadMembers(
        membership.organizationId,
        threadId,
        thread.memberIds.filter((id) => id !== uid)
      );
    } catch (e: any) {
      showAlert("No se pudo quitar", e?.message ?? "Intenta de nuevo.");
    }
  };

  const handleSend = async () => {
    if (!membership?.organizationId || !user || !text.trim() || !threadId) return;
    setSending(true);
    try {
      await sendMessage({
        organizationId: membership.organizationId,
        threadId,
        text,
        authorUid: user.uid,
        authorName: membership.name ?? user.email ?? "Usuario",
        authorRole: membership.role,
        salonName: thread?.salonName,
      });
      setText("");
    } catch (e) {
      console.warn("Error al enviar:", e);
    } finally {
      setSending(false);
    }
  };

  const myUid = user?.uid;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Breadcrumb items={[{ label: "Inicio", href: "/" }, { label: "Chat", href: "/chat" }, { label: thread?.title ?? "Chat" }]} />
      </View>

      {thread ? (
        <View style={styles.membersRow}>
          {thread.memberIds.map((uid) => (
            <View key={uid} style={styles.memberChip}>
              <Text style={styles.memberChipText}>{memberLabels.get(uid) ?? "Miembro"}</Text>
              {canManageMembers ? (
                <Pressable onPress={() => handleRemoveMember(uid)} hitSlop={8}>
                  <Text style={styles.memberChipRemove}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          {canManageMembers ? (
            <Pressable onPress={() => setShowAddMember((v) => !v)} style={styles.addMemberButton}>
              <Text style={styles.addMemberButtonText}>+ Agregar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {canManageMembers && showAddMember ? (
        <View style={styles.addMemberBox}>
          <TextInput
            value={memberSearch}
            onChangeText={setMemberSearch}
            placeholder="Buscar profesional, participante o apoderado"
            style={styles.addMemberInput}
          />
          {memberSearchResults.length > 0 ? (
            <View style={styles.searchResults}>
              {memberSearchResults.map((opt) => (
                <Pressable key={opt.uid} onPress={() => handleAddMember(opt.uid)} style={styles.searchResultRow}>
                  <Text style={styles.searchResultText}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : memberSearch.trim().length > 0 ? (
            <Text style={styles.searchEmpty}>Sin resultados.</Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <Text style={styles.empty}>Sin mensajes aún. ¡Sé el primero!</Text>
        }
        renderItem={({ item }) => {
          const isMe = item.authorUid === myUid;
          const readAt = isMe ? getReadReceipt(thread, item, myUid) : null;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              {!isMe ? (
                <Text style={styles.bubbleSender}>{item.authorName}</Text>
              ) : null}
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
              </Text>
              {readAt ? (
                <Text style={styles.readReceipt}>↑ Leído {formatTime(readAt)}</Text>
              ) : null}
            </View>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.slate}
          multiline
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          disabled={sending || !text.trim()}
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
        >
          <Text style={styles.sendButtonText}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(ts: any) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date();
  return date.toLocaleTimeString("es-419", { hour: "2-digit", minute: "2-digit" });
}

// Última hora en la que algún otro miembro del hilo leyó este mensaje (o null si nadie lo ha leído aún)
function getReadReceipt(thread: ChatThread | null, message: ChatMessage, myUid?: string): Date | null {
  if (!thread?.readBy || !myUid) return null;
  const created = message.createdAt?.toDate ? message.createdAt.toDate() : null;
  if (!created) return null;
  let latest: Date | null = null;
  for (const uid of thread.memberIds) {
    if (uid === myUid) continue;
    const readTs = thread.readBy[uid];
    const readDate = readTs?.toDate ? readTs.toDate() : null;
    if (readDate && readDate >= created && (!latest || readDate > latest)) {
      latest = readDate;
    }
  }
  return latest;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  messageList: { padding: spacing.md, paddingBottom: spacing.lg },
  bubble: {
    maxWidth: "80%",
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignSelf: "flex-start",
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  bubbleThem: {},
  bubbleSender: { fontSize: 11, fontWeight: "700", color: colors.tealDark, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: colors.ink },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: colors.slate, marginTop: 4, textAlign: "right" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.7)" },
  readReceipt: {
    fontSize: 10,
    color: colors.green,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "700",
  },
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
  membersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  memberChip: {
    backgroundColor: colors.tealTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberChipText: { fontSize: 11, color: colors.tealDark, fontWeight: "600" },
  memberChipRemove: { fontSize: 13, color: colors.tealDark, fontWeight: "700" },
  addMemberButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  addMemberButtonText: { fontSize: 11, color: colors.teal, fontWeight: "700" },
  addMemberBox: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  addMemberInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    backgroundColor: colors.card,
  },
  searchResults: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  searchResultRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchResultText: { fontSize: 13, color: colors.ink },
  searchEmpty: { fontSize: 12, color: colors.slate, marginTop: spacing.xs },
  inputBar: {
    flexDirection: "row",
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
