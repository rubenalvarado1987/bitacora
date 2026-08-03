import React, { createContext, useContext, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../theme";

interface SnackbarContextType {
  showSnackbar: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({ showSnackbar: () => {} });

export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const showSnackbar = (msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    translateY.setValue(-16);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
    ]).start();
    timeoutRef.current = setTimeout(dismiss, 2200);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      <View style={styles.root}>
        {children}
        <Animated.View style={[styles.snackbar, { opacity, transform: [{ translateY }] }]}>
          <Text style={styles.text}>{message}</Text>
          <Pressable onPress={dismiss} style={styles.closeBtn} hitSlop={6}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SnackbarContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  snackbar: {
    position: "absolute",
    top: "45%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 280,
  },
  text: { color: "#fff", fontSize: 13, fontWeight: "600", letterSpacing: 0.2, flex: 1 },
  closeBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: radius.sm,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 13 },
});


