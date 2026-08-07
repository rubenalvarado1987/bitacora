import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider } from "../src/context/AuthContext";
import { SnackbarProvider } from "../src/context/SnackbarContext";
import GradientBackground from "../src/components/GradientBackground";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <View style={{ flex: 1 }}>
          <GradientBackground />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          />
        </View>
      </SnackbarProvider>
    </AuthProvider>
  );
}

