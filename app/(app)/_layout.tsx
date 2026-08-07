import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import LoadingScreen from "../../src/components/LoadingScreen";
import { colors } from "../../src/theme";

export default function AppLayout() {
  const { user, membership, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!membership) {
    return <Redirect href="/setup" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
