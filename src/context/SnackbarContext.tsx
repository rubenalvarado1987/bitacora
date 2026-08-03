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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timeoutRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 2500);
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar }}>
      <View style={styles.root}>
        {children}
        <Animated.View style={[styles.snackbar, { opacity }]} pointerEvents="none">
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
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  text: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
