import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../src/context/AuthContext";
import { firebaseConfigError } from "../src/firebase";
import LoadingScreen from "../src/components/LoadingScreen";
import { colors, radius, spacing } from "../src/theme";

export default function RegisterScreen() {
  const { user, membership, loading, signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordStrength = useMemo(() => scorePassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && membership) {
    return <Redirect href="/" />;
  }

  if (user && !membership) {
    return <Redirect href="/setup" />;
  }

  const canSubmit =
    !submitting && !!name.trim() && emailLooksValid && password.length >= 6 && passwordsMatch && !firebaseConfigError;

  const handleRegister = async () => {
    if (firebaseConfigError) {
      setError(firebaseConfigError);
      return;
    }
    if (!name.trim()) {
      setError("Ingresa tu nombre.");
      return;
    }
    if (!emailLooksValid) {
      setError("Ingresa un correo válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!passwordsMatch) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/setup");
    } catch (e: any) {
      setError(mensajeDeError(e?.code));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[colors.tealDark, colors.teal, "#0F3E3C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.blobTop} />
      <View pointerEvents="none" style={styles.blobBottom} />

      <View style={styles.content}>
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>Bitácora</Text>
          <Text style={styles.tagline}>Crea tu cuenta y arma tu propia organización en minutos.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Crear cuenta</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre completo"
            placeholderTextColor={colors.slate}
            autoCapitalize="words"
          />

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
          {email.length > 0 && !emailLooksValid ? (
            <Text style={styles.hint}>Formato de correo inválido.</Text>
          ) : null}

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={colors.slate}
          />
          {password.length > 0 ? (
            <View style={styles.strengthRow}>
              <View style={styles.strengthTrack}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${passwordStrength.percent}%`,
                      backgroundColor: passwordStrength.color,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repite tu contraseña"
            placeholderTextColor={colors.slate}
          />
          {confirmPassword.length > 0 && !passwordsMatch ? (
            <Text style={styles.hint}>Las contraseñas no coinciden.</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!error && firebaseConfigError ? <Text style={styles.error}>{firebaseConfigError}</Text> : null}

          <Pressable
            onPress={handleRegister}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <Link href="/login" style={styles.loginLink}>
              Inicia sesión
            </Link>
          </View>
        </View>
      </View>
    </View>
  );
}

function scorePassword(password: string) {
  if (!password) return { percent: 0, label: "", color: colors.line };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { percent: 25, label: "Débil", color: colors.danger };
  if (score <= 3) return { percent: 60, label: "Aceptable", color: colors.amber };
  return { percent: 100, label: "Fuerte", color: colors.green };
}

function mensajeDeError(code?: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con este correo.";
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/invalid-api-key":
      return "La API key de Firebase no es valida. Revisa EXPO_PUBLIC_FIREBASE_API_KEY en .env.";
    case "auth/weak-password":
      return "La contraseña es demasiado débil.";
    default:
      return "No se pudo crear la cuenta. Intenta de nuevo.";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.tealDark },
  blobTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 240,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  brandBlock: { alignItems: "center", marginBottom: spacing.xl, maxWidth: 340 },
  brand: { fontSize: 36, fontWeight: "800", color: "#fff", letterSpacing: 0.4 },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  form: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...Platform.select({ web: { boxShadow: "0 20px 60px rgba(0,0,0,0.25)" } }),
  },
  formTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  label: { fontSize: 12, color: colors.slate, marginBottom: spacing.xs, marginTop: spacing.sm, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.ink,
  },
  hint: { color: colors.amber, fontSize: 11, marginTop: 4 },
  strengthRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs, gap: spacing.sm },
  strengthTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  strengthFill: { height: "100%", borderRadius: 3 },
  strengthLabel: { fontSize: 11, fontWeight: "700", minWidth: 58, textAlign: "right" },
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
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  loginText: { color: colors.slate, fontSize: 13 },
  loginLink: { color: colors.teal, fontSize: 13, fontWeight: "700" },
});
