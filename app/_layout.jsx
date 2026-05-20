// 1. MUST BE LINE 1
import "react-native-gesture-handler";

import { Stack, SplashScreen } from "expo-router";
import { useStore } from "../src/store/useStore";
import { View, Animated, TouchableOpacity, Text, StyleSheet, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { initDB } from "../src/db/localDB";
import { supabase } from "../src/supabase/supabaseClient";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// Prevent splash screen from hiding until store is ready
SplashScreen.preventAutoHideAsync();

function OfflineModal({ visible, pendingCount, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = React.useState(15);

  useEffect(() => {
    if (visible) {
      setCountdown(15);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      setCountdown(15);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalCard,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.modalIconBox}>
            <Ionicons name="cloud-offline-outline" size={32} color="#FF6B6B" />
          </View>
          <Text style={styles.modalTitle}>You're Offline</Text>
          <Text style={styles.modalMessage}>
            {pendingCount > 0
              ? `No internet connection detected. You have ${pendingCount} pending change${pendingCount > 1 ? "s" : ""} that will sync when you're back online.`
              : "No internet connection detected. Your data is safe — changes will sync automatically when you're back online."}
          </Text>
          <Text style={[styles.modalMessage, { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: -4 }]}>
            This modal will close in {countdown} second{countdown !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity style={styles.modalBtn} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.modalBtnText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function OnlineModal({ visible, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = React.useState(15);

  useEffect(() => {
    if (visible) {
      setCountdown(15);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onDismiss();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      setCountdown(15);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalCard, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.modalIconBox, { backgroundColor: "rgba(46,204,113,0.12)" }]}>
            <Ionicons name="cloud-done-outline" size={32} color="#2ECC71" />
          </View>
          <Text style={styles.modalTitle}>Back Online</Text>
          <Text style={styles.modalMessage}>
            Your connection has been restored. Any pending changes are being synced now.
          </Text>
          <Text style={[styles.modalMessage, { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: -4 }]}>
            This modal will close in {countdown} second{countdown !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#2ECC71" }]} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.modalBtnText}>Great</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
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
  const [offlineModalDismissed, setOfflineModalDismissed] = React.useState(false);
  const [onlineModalDismissed, setOnlineModalDismissed] = React.useState(true);
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
        setOfflineModalDismissed(false);
        setOnlineModalDismissed(false); // show "back online" modal
      }
      if (!online && wasOffline.current === false) {
        setOfflineModalDismissed(false);
        setOnlineModalDismissed(true); // hide online modal while offline
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
      <OfflineModal
        visible={!isOnline && !offlineModalDismissed}
        pendingCount={pendingCount}
        onDismiss={() => setOfflineModalDismissed(true)}
      />
      <OnlineModal
        visible={isOnline && !onlineModalDismissed}
        onDismiss={() => setOnlineModalDismissed(true)}
      />
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
        <Stack.Screen name="(tabs)" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="details" />
        <Stack.Screen name="edit" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="search"
          options={{ presentation: "transparentModal" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // Offline Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1c1c1e",
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,107,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
  },
  modalBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    marginTop: 6,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});