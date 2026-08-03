import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/context/AuthContext";
import { SnackbarProvider } from "../src/context/SnackbarContext";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <StatusBar style="dark" backgroundColor={colors.paper} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
      </SnackbarProvider>
    </AuthProvider>
  );
}
