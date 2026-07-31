import React, { useEffect, useRef, useState } from "react";
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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../src/firebase";
import { useAuth } from "../../../src/context/AuthContext";
import { listenMessages, sendMessage } from "../../../src/data/chatRepository";
import { colors, radius, spacing } from "../../../src/theme";
import { ChatMessage, ChatThread } from "../../../src/types";

export default function ChatThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const { membership, user } = useAuth();
  const flatRef = useRef<FlatList>(null);

  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!membership?.organizationId || !threadId) return;
    (async () => {
      const snap = await getDoc(
        doc(db, "organizations", membership.organizationId, "chatThreads", threadId)
      );
      if (snap.exists()) setThread({ id: snap.id, ...snap.data() } as ChatThread);
    })();

    return listenMessages(membership.organizationId, threadId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
  }, [membership?.organizationId, threadId]);

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
      <Stack.Screen options={{ title: thread?.title ?? "Chat" }} />

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
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              {!isMe ? (
                <Text style={styles.bubbleSender}>{item.authorName}</Text>
              ) : null}
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
              </Text>
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
  const date = ts.toDate ? ts.toDate() : new Date();
  return date.toLocaleTimeString("es-419", { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
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
  empty: { color: colors.slate, fontSize: 13, textAlign: "center", marginTop: spacing.xl },
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
