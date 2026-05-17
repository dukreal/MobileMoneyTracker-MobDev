import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { useStore } from "../store/useStore";
import { supabase } from "../supabase/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

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

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    surface: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#8e8e93" : "#8e8e93",
    border: isDarkMode ? "#2c2c2c" : "#f0f0f0",
    accent: "#4A90E2",
    danger: "#FF6B6B",
    success: "#2ECC71",
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout and clear local data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          logout();
          await WebBrowser.dismissBrowser();
        },
      },
    ]);
  };

  const handleMergeGoogle = async () => {
    try {
      const redirectUri = "https://auth.expo.io/@dukdakdok/MobileMoneyTracker";
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: redirectUri, queryParams: { prompt: "select_account" } },
      });
      if (error) throw error;
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === "success") {
          const { data: { session: newSession } } = await supabase.auth.refreshSession();
          if (newSession && !newSession.user.is_anonymous) {
            setSession(newSession);
            Alert.alert("Success", "Account Linked!");
          }
        }
      }
    } catch (error) {
      Alert.alert("Link Error", error.message);
    }
  };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
      {/* HEADER - Consistent with Analytics/Add */}
      <View style={[styles.heroSection, { borderBottomColor: theme.border }]}>
        <Text style={[styles.heroTitle, { color: theme.text }]}>Profile</Text>
        
        <View style={styles.userProfileCard}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="person" size={40} color={theme.accent} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userEmail, { color: theme.text }]} numberOfLines={1}>
              {isGuest ? "Guest User" : session?.user?.email}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: isGuest ? theme.danger + "15" : theme.success + "15" }]}>
              <Text style={[styles.statusText, { color: isGuest ? theme.danger : theme.success }]}>
                {isGuest ? "LIMIT: 7 DAYS HISTORY" : "CLOUD SYNC ACTIVE"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        {/* PREFERENCES SECTION */}
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>Preferences</Text>
        
        <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Dark Mode Toggle */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconCircle, { backgroundColor: "#AF52DE20" }]}>
                <Ionicons name="moon" size={18} color="#AF52DE" />
              </View>
              <Text style={[styles.settingText, { color: theme.text }]}>Appearance</Text>
            </View>
            <View style={styles.settingAction}>
               <Text style={[styles.actionLabel, { color: theme.subText }]}>{isDarkMode ? "Dark" : "Light"}</Text>
               <Switch 
                 value={isDarkMode} 
                 onValueChange={toggleDarkMode}
                 trackColor={{ false: "#ddd", true: theme.accent }}
               />
            </View>
          </View>

          {/* Currency Selection */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconCircle, { backgroundColor: theme.success + "20" }]}>
                <Ionicons name="cash" size={18} color={theme.success} />
              </View>
              <Text style={[styles.settingText, { color: theme.text }]}>Currency</Text>
            </View>
            <View style={styles.currencyToggle}>
              {["₱", "$", "€"].map((cur) => (
                <TouchableOpacity
                  key={cur}
                  onPress={() => setCurrency(cur)}
                  style={[
                    styles.curBtn,
                    currency === cur ? { backgroundColor: theme.accent } : { backgroundColor: theme.bg }
                  ]}
                >
                  <Text style={[styles.curBtnText, { color: currency === cur ? "#fff" : theme.subText }]}>
                    {cur}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        {isGuest && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subText, marginTop: 20 }]}>Security</Text>
            <TouchableOpacity 
              style={[styles.linkCard, { backgroundColor: theme.accent }]} 
              onPress={handleMergeGoogle}
              activeOpacity={0.9}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.linkTitle}>Sync to Cloud</Text>
                <Text style={styles.linkSub}>Link Google to save data permanently</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ffffff80" />
            </TouchableOpacity>
          </>
        )}

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.logoutCard, { borderColor: theme.danger + "30" }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={theme.danger} />
          <Text style={[styles.logoutText, { color: theme.danger }]}>Logout & Clear Session</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.subText }]}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  heroSection: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 20,
    textAlign: 'center'
  },
  userProfileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { marginLeft: 15, flex: 1 },
  userEmail: { fontSize: 17, fontWeight: "700" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  scrollPadding: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingText: { fontSize: 15, fontWeight: "600" },
  settingAction: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionLabel: { fontSize: 13, fontWeight: "500" },
  currencyToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  curBtn: {
    width: 36,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  curBtnText: { fontSize: 14, fontWeight: "800" },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginTop: 5,
  },
  linkTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  linkSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 1 },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 30,
    gap: 10,
    backgroundColor: "rgba(255,107,107,0.05)",
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 30,
    fontWeight: "600",
    opacity: 0.6,
  },
});