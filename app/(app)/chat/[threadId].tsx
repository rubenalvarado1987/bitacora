import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import {
  closeThread,
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
import AppIcon from "../../../src/components/AppIcon";
import Breadcrumb from "../../../src/components/Breadcrumb";

export default function ChatThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { membership, user } = useAuth();
  const router = useRouter();
  const flatRef = useRef<FlatList>(null);

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [participants, setParticipants] = useState<Person[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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
    // El usuario actual siempre resuelve con su propio nombre (cubre al admin y cualquier rol sin perfil en la colección)
    if (user?.uid && membership?.name) {
      map.set(user.uid, membership.name);
    }
    return map;
  }, [profiles, participants, user?.uid, membership?.name]);

  const canManageMembers = membership?.role === "admin" || membership?.role === "editor" || membership?.role === "profesional";
  const canCloseThread = membership?.role === "admin" || membership?.role === "profesional";
  const isClosed = thread?.status === "closed";

  const handleCloseThread = () => {
    setShowConfirmClose(true);
  };

  const doCloseThread = async () => {
    if (!membership?.organizationId || !threadId || !user) return;
    setShowConfirmClose(false);
    try {
      await closeThread(membership.organizationId, threadId, user.uid);
      router.push("/chat" as any);
    } catch (e: any) {
      showAlert("Error", e?.message ?? "No se pudo cerrar el hilo.");
    }
  };

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
        <View style={styles.headerActions}>
          {isClosed ? (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerText}>Hilo cerrado · solo lectura</Text>
            </View>
          ) : canCloseThread && thread ? (
            <Pressable onPress={handleCloseThread} style={styles.closeThreadButton}>
              <Text style={styles.closeThreadButtonText}>Cerrar hilo</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {thread ? (
        <View style={styles.membersRow}>
          {thread.memberIds
            .filter((uid) => memberLabels.has(uid) && !(uid === user?.uid && membership?.role === "admin"))
            .map((uid) => (
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
                <Text style={styles.bubbleSender}>
                  {item.authorName}{item.authorRole === "admin" ? " (Admin)" : ""}
                </Text>
              ) : item.authorRole === "admin" ? (
                <Text style={[styles.bubbleSender, styles.bubbleSenderAdmin]}>Tú (Admin)</Text>
              ) : null}
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
              </Text>
              {readAt ? (
                <Text style={[styles.readReceipt, isMe && styles.readReceiptMe]}>↑ Leído {formatTime(readAt)}</Text>
              ) : null}
            </View>
          );
        }}
      />

      {/* Modal de confirmación para cerrar hilo */}
      <Modal
        visible={showConfirmClose}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmClose(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setShowConfirmClose(false)}>
          <Pressable style={styles.confirmCard} onPress={() => {}}>
            <View style={styles.confirmIconWrap}>
              <AppIcon name="alert-circle-outline" size={40} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Cerrar hilo</Text>
            <Text style={styles.confirmMessage}>
              ¿Seguro que deseas cerrar esta conversación? Quedará en el histórico y no se podrán enviar más mensajes.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable style={styles.confirmCancel} onPress={() => setShowConfirmClose(false)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmDanger} onPress={doCloseThread}>
                <Text style={styles.confirmDangerText}>Cerrar hilo</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {isClosed ? (
        <View style={styles.closedInputBar}>
          <Text style={styles.closedInputBarText}>Esta conversación está cerrada.</Text>
        </View>
      ) : (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un mensaje…"
            placeholderTextColor={colors.slate}
            multiline
            onKeyPress={(e: any) => {
              if (e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
                e.preventDefault?.();
                handleSend();
              }
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>Enviar</Text>
          </Pressable>
        </View>
      )}
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
  headerActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.xs },
  closeThreadButton: {
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  closeThreadButtonText: { fontSize: 12, color: "#EF4444", fontWeight: "700" },
  closedBanner: {
    backgroundColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  closedBannerText: { fontSize: 12, color: colors.slate, fontWeight: "600" },
  closedInputBar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: "center",
  },
  closedInputBarText: { fontSize: 13, color: colors.slate },
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
  bubbleSenderAdmin: { color: "rgba(255,255,255,0.75)", textAlign: "right" },
  bubbleText: { fontSize: 14, color: colors.ink },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: colors.slate, marginTop: 4, textAlign: "right" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.92)" },
  readReceipt: {
    fontSize: 10,
    color: colors.green,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "700",
  },
  readReceiptMe: { color: "rgba(255,255,255,0.92)" },
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
  // Confirm close modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  confirmCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  confirmIconWrap: { marginBottom: spacing.md },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center", marginBottom: 8 },
  confirmMessage: { fontSize: 13, color: colors.slate, textAlign: "center", lineHeight: 20, marginBottom: spacing.lg },
  confirmActions: { flexDirection: "row", gap: spacing.sm, alignSelf: "stretch" },
  confirmCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "600", color: colors.ink },
  confirmDanger: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  confirmDangerText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
