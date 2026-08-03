import React, { createContext, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
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

  const showSnackbar = (msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    translateY.setValue(-16);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
    ]).start();
    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 2200);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      <View style={styles.root}>
        {children}
        <Animated.View style={[styles.snackbar, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
          <Text style={styles.text}>{message}</Text>
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
    backgroundColor: "rgba(30, 30, 30, 0.92)",
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 260,
  },
  text: { color: "#fff", fontSize: 13, fontWeight: "600", textAlign: "center", letterSpacing: 0.2 },
});

