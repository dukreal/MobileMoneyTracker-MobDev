// 1. MUST BE LINE 1
import "react-native-gesture-handler";

import { Stack, SplashScreen } from "expo-router";
import { useStore } from "../src/store/useStore";
import { View, Animated, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { initDB } from "../src/db/localDB";
import { supabase } from "../src/supabase/supabaseClient";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// Prevent splash screen from hiding until store is ready
SplashScreen.preventAutoHideAsync();

function OfflineBanner({ visible, pendingCount }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = React.useState(false);
  const dismissTimer = useRef(null);

  React.useEffect(() => {
    if (visible) {
      setDismissed(false);
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      dismissTimer.current = setTimeout(() => {
        setDismissed(true);
      }, 4000);
    } else {
      clearTimeout(dismissTimer.current);
      opacity.setValue(0);
      setDismissed(false);
    }
    return () => clearTimeout(dismissTimer.current);
  }, [visible]);

  const handleClose = () => {
    clearTimeout(dismissTimer.current);
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>
        ⚡ You're offline
        {pendingCount > 0
          ? ` · ${pendingCount} change${pendingCount > 1 ? "s" : ""} pending`
          : ""}
      </Text>
      <TouchableOpacity onPress={handleClose} style={styles.offlineClose}>
        <Text style={styles.offlineCloseText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {

  const {
    isDarkMode,
    _hasHydrated,
    session,
    setSession,
    isOnline,
    setIsOnline,
    syncQueue,
    refreshPendingCount,
    pendingCount,
  } = useStore();
  const wasOffline = useRef(false);
  const bgColor = isDarkMode ? "#121212" : "#ffffff";
  const [authReady, setAuthReady] = React.useState(false);
  const router = require("expo-router").useRouter();

  useEffect(() => {
    if (_hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [_hasHydrated]);

  useEffect(() => {
    initDB().catch((e) => console.warn("[DB] Init failed:", e));
    refreshPendingCount();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online && wasOffline.current) {
        console.log("[NetInfo] Back online — syncing queue");
        syncQueue();
      }
      wasOffline.current = !online;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Always verify session with Supabase first
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthReady(true);
    });

    // Listen for auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log(
        "Layout auth change:",
        _event,
        currentSession ? "HAS SESSION" : "NO SESSION",
      );
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !_hasHydrated) return;
    if (!session) {
      router.replace("/login");
    } else {
      router.replace("/(tabs)");
    }
  }, [session, authReady, _hasHydrated]);

  // Wait for both store hydration AND Supabase session check
  if (!_hasHydrated || !authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OfflineBanner visible={!isOnline} pendingCount={pendingCount} />
      {/* 
         FIX: Removing the manual background View here often solves 
         Android layout overlap issues because NavigationContainer 
         handles the screen height better on its own.
      */}
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
        backgroundColor={bgColor}
        translucent={false}
      />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: bgColor },
          animation: "slide_from_right",
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          freezeOnBlur: false,
        }}
      >
        <Stack.Screen name="login" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="details" />
        <Stack.Screen name="edit" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="search"
          options={{ presentation: "transparentModal" }}
        />
      </Stack>
      <OfflineBanner visible={!isOnline} pendingCount={pendingCount} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 14,
    backgroundColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  offlineText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    flex: 1,
    textAlign: "center",
  },
  offlineClose: {
    paddingLeft: 10,
  },
  offlineCloseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
