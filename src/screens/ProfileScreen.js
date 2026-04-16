import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useStore } from "../store/useStore";
import { supabase } from "../supabase/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

// Required for mobile browser login to work
WebBrowser.maybeCompleteAuthSession();

export default function ProfileScreen() {
  const {
    isGuest,
    currency,
    setCurrency,
    isDarkMode,
    toggleDarkMode,
    logout,
    session,
    setSession,
  } = useStore();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      logout();
      await WebBrowser.dismissBrowser();
      Alert.alert("Logged Out", "Session cleared.");
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  const handleMergeGoogle = async () => {
    try {
      // 1. HARDCODE THE PROXY LINK
      // This must match your Supabase Dashboard exactly!
      const redirectUri = "https://auth.expo.io/@dukdakdok/MobileMoneyTracker";

      console.log("DEBUG: Using Proxy URI:", redirectUri);

      // 2. Request the linking URL from Supabase
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: redirectUri,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        // 3. Open the browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
        );

        // 4. If the browser closes (Success)
        if (result.type === "success") {
          // Immediately check the server for the new session
          const {
            data: { session: newSession },
          } = await supabase.auth.refreshSession();
          if (newSession && !newSession.user.is_anonymous) {
            setSession(newSession);
            Alert.alert("Success", "Account Linked!");
          }
        }
      }
    } catch (error) {
      if (error.message.includes("already been linked")) {
        Alert.alert(
          "Account Taken",
          "This Google account is already linked to another user. Please logout and 'Sign in with Google' instead.",
        );
      } else {
        Alert.alert("Link Error", error.message);
      }
    }
  };

  const refreshStatus = async () => {
    try {
      const {
        data: { session: newSession },
        error,
      } = await supabase.auth.refreshSession();
      if (error) throw error;

      if (newSession && !newSession.user.is_anonymous) {
        setSession(newSession);
        Alert.alert(
          "Success",
          "Account synced! You are now logged in with Google.",
        );
      } else {
        Alert.alert(
          "Notice",
          "We couldn't find a linked Google account yet. Please try linking again.",
        );
      }
    } catch (err) {
      Alert.alert("Error", "Could not sync: " + err.message);
    }
  };

  // Helper for dynamic colors
  const theme = {
    bg: isDarkMode ? "#121212" : "#f8f9fa",
    card: isDarkMode ? "#1e1e1e" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#888" : "#999",
    border: isDarkMode ? "#333" : "#eee",
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* User Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: isDarkMode ? "transparent" : "#fff" },
        ]}
      >
        <View
          style={[styles.avatar, isDarkMode && { backgroundColor: "#333" }]}
        >
          <Ionicons
            name="person"
            size={40}
            color={isDarkMode ? "#aaa" : "#fff"}
          />
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>
          {isGuest ? "Guest User" : session?.user?.email || "Verified Member"}
        </Text>
        <Text style={{ color: theme.subText, fontSize: 12, marginBottom: 15 }}>
          {isGuest ? "History limited to 7 days" : "Cloud Sync Active"}
        </Text>

        {isGuest && (
          <View style={{ alignItems: "center" }}>
            <TouchableOpacity
              style={styles.mergeBtn}
              onPress={handleMergeGoogle}
            >
              <Ionicons
                name="logo-google"
                size={18}
                color="#007AFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.mergeText}>Link with Google</Text>
            </TouchableOpacity>

            {/* --- ADD THIS NEW BUTTON BELOW --- */}
            <TouchableOpacity style={{ marginTop: 20 }} onPress={refreshStatus}>
              <Text
                style={{
                  color: isDarkMode ? "#666" : "#999",
                  textDecorationLine: "underline",
                  fontSize: 13,
                }}
              >
                Already linked but still seeing Guest? Tap to sync.
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>
          Preferences
        </Text>

        {/* Dark Mode */}
        <View
          style={[
            styles.row,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.rowLabel}>
            <Ionicons
              name="moon"
              size={20}
              color={isDarkMode ? "#fff" : "#000"}
            />
            <Text style={[styles.rowText, { color: theme.text }]}>
              {" "}
              Dark Mode
            </Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
        </View>

        {/* Currency Selection */}
        <View
          style={[
            styles.row,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.rowLabel}>
            <Ionicons
              name="cash"
              size={20}
              color={isDarkMode ? "#fff" : "#000"}
            />
            <Text style={[styles.rowText, { color: theme.text }]}>
              {" "}
              Currency
            </Text>
          </View>
          <View style={styles.currencyRow}>
            {["₱", "$", "€"].map((cur) => (
              <TouchableOpacity
                key={cur}
                onPress={() => setCurrency(cur)}
                style={[
                  styles.curBtn,
                  currency === cur && {
                    backgroundColor: isDarkMode ? "#fff" : "#000",
                  },
                  currency !== cur && isDarkMode && { backgroundColor: "#333" },
                ]}
              >
                <Text
                  style={{
                    color:
                      currency === cur
                        ? isDarkMode
                          ? "#000"
                          : "#fff"
                        : isDarkMode
                          ? "#fff"
                          : "#000",
                    fontWeight: "bold",
                  }}
                >
                  {cur}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout & Clear Data</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: theme.subText }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", padding: 30, marginBottom: 10 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  userName: { fontSize: 22, fontWeight: "bold" },
  mergeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  mergeText: { color: "#007AFF", fontWeight: "bold" },
  section: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  rowLabel: { flexDirection: "row", alignItems: "center" },
  rowText: { fontSize: 16, marginLeft: 10, fontWeight: "500" },
  currencyRow: { flexDirection: "row" },
  curBtn: {
    padding: 8,
    width: 40,
    alignItems: "center",
    borderRadius: 10,
    marginLeft: 8,
    backgroundColor: "#eee",
  },
  logoutBtn: {
    margin: 30,
    padding: 18,
    backgroundColor: "#ff3b3015",
    borderRadius: 15,
    alignItems: "center",
  },
  logoutText: { color: "#ff3b30", fontWeight: "bold", fontSize: 16 },
  version: { textAlign: "center", fontSize: 12, marginBottom: 50 },
});
