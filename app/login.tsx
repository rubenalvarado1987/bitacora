import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { firebaseConfigError } from "../src/firebase";
import LoadingScreen from "../src/components/LoadingScreen";
import { colors, radius, spacing } from "../src/theme";

export default function LoginScreen() {
  const { user, membership, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && membership) {
    return <Redirect href="/" />;
  }

  if (user && !membership) {
    return <Redirect href="/setup" />;
  }

  const handleSignIn = async () => {
    if (firebaseConfigError) {
      setError(firebaseConfigError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(mensajeDeError(e?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Bitácora</Text>
      <Text style={styles.subtitle}>Ficha autoadministrable y seguimiento longitudinal</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="nombre@organizacion.com"
          placeholderTextColor={colors.slate}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.slate}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && firebaseConfigError ? <Text style={styles.error}>{firebaseConfigError}</Text> : null}

        <Pressable
          onPress={handleSignIn}
          disabled={submitting || !email || !password || !!firebaseConfigError}
          style={({ pressed }) => [
            styles.button,
            (submitting || !email || !password || !!firebaseConfigError) &&
              styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>¿No tienes cuenta? </Text>
          <Link href="/register" style={styles.registerLink}>
            Regístrate
          </Link>
        </View>
      </View>
    </View>
  );
}

function mensajeDeError(code?: string) {
  switch (code) {
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/invalid-api-key":
      return "La API key de Firebase no es valida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  brand: { fontSize: 34, fontWeight: "700", color: colors.tealDark },
  subtitle: {
    fontSize: 14,
    color: colors.slate,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    textAlign: "center",
    maxWidth: 280,
  },
  form: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    ...Platform.select({ web: { boxShadow: "0 1px 2px rgba(0,0,0,0.04)" } }),
  },
  label: { fontSize: 12, color: colors.slate, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  registerRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  registerText: { color: colors.slate, fontSize: 13 },
  registerLink: { color: colors.teal, fontSize: 13, fontWeight: "700" },
});
