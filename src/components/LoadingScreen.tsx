import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../theme";

export default function LoadingScreen({ label = "Cargando…" }: { label?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ scale }], opacity }]} />
      <Animated.Text style={[styles.brand, { opacity }]}>Bitácora</Animated.Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  ring: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.tealTint,
    borderTopColor: colors.teal,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.teal,
  },
  brand: {
    marginTop: spacing.lg,
    fontSize: 20,
    fontWeight: "700",
    color: colors.tealDark,
    letterSpacing: 0.4,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.slate,
  },
});
