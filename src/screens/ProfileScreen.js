import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Pressable,
} from "react-native";
import { useStore } from "../store/useStore";
import { supabase } from "../supabase/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// ─── Animated Row Component ──────────────────────────────────────────────────
function AnimatedRow({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Pressable Row with scale micro-interaction ───────────────────────────────
function PressableRow({ onPress, children, style }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color, theme }) {
  return (
    <View style={[statStyles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[statStyles.iconBox, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={[statStyles.value, { color: theme.text }]} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={[statStyles.label, { color: theme.subText }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  value: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, flexShrink: 1 },
  label: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
});

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, theme }) {
  return (
    <Text style={[styles.sectionLabel, { color: theme.subText }]}>{label}</Text>
  );
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingItem({ icon, iconBg, iconColor, label, right, borderBottom, theme }) {
  return (
    <View
      style={[
        styles.settingRow,
        borderBottom && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={[styles.settingText, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>{right}</View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
import { useRouter, useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function ProfileScreen() {
  const router = useRouter();
  const {
    isGuest,
    currency,
    setCurrency,
    isDarkMode,
    logout,
    session,
    setSession,
    user,
  } = useStore();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0.8)).current;

  useFocusEffect(
    useCallback(() => {
      const fetchStats = async () => {
        let userId = user?.id ?? session?.user?.id;
        if (!userId) {
          const { data: { session: authSession } } = await supabase.auth.getSession();
          userId = authSession?.user?.id;
        }
        if (!userId) return;
        const { data } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("user_id", userId);
        if (data) {
          const income = data.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
          const spent = data.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
          setTotalIncome(income);
          setTotalSpent(spent);
        }
      };
      fetchStats();
    }, [user?.id, session?.user?.id])
  );

  const theme = {
    bg: isDarkMode ? "#0d0d0d" : "#f7f7f5",
    surface: isDarkMode ? "#1a1a1a" : "#ffffff",
    surfaceAlt: isDarkMode ? "#222222" : "#f0efec",
    text: isDarkMode ? "#f0f0f0" : "#111111",
    subText: isDarkMode ? "#666666" : "#999999",
    border: isDarkMode ? "#2a2a2a" : "#e8e8e4",
    accent: "#3B7DD8",
    accentAlt: "#1a1a1a",
    danger: "#E05252",
    success: "#27AE60",
    warning: "#F39C12",
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) console.log("Sign out error:", error.message);
          } catch (e) {
            console.log("Sign out exception:", e.message);
          } finally {
            await logout();
          }
        },
      },
    ]);
  };

  const handleMergeGoogle = async () => {
    const oldUserId = session?.user?.id;

    const doSignInWithGoogle = async () => {
      try {
        const { data: anonTxs } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", oldUserId);
        const hasGuestTransactions = anonTxs && anonTxs.length > 0;

        // Save oldUserId to AsyncStorage so LoginScreen's deep link handler
        // can't beat us to the migration
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        if (hasGuestTransactions && oldUserId) {
          await AsyncStorage.setItem("pending_migration_user_id", oldUserId);
        }

        const redirectUri = "com.moneytracker.app://";
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUri, queryParams: { prompt: "select_account" } },
        });
        if (error) throw error;
        if (data?.url) {
          const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
          if (result.type === "success" && result.url) {
            const url = result.url;
            const fragment = url.split("#")[1] || "";
            const query = url.split("?")[1]?.split("#")[0] || "";
            const params = new URLSearchParams(fragment || query);
            const code = new URLSearchParams(query).get("code") || params.get("code");
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");

            let newSession = null;
            if (code) {
              const { data: ex, error: ee } = await supabase.auth.exchangeCodeForSession(code);
              if (ee) throw ee;
              newSession = ex.session;
            } else if (access_token && refresh_token) {
              const { data: sd, error: se } = await supabase.auth.setSession({ access_token, refresh_token });
              if (se) throw se;
              newSession = sd.session;
            } else {
              const { data: { session: refreshed } } = await supabase.auth.refreshSession();
              newSession = refreshed;
            }

            if (newSession) {
              const newUserId = newSession.user.id;
              console.log("=== MIGRATION DEBUG ===");
              console.log("oldUserId:", oldUserId);
              console.log("newUserId:", newUserId);
              console.log("hasGuestTransactions:", hasGuestTransactions);
              console.log("anonTxs:", JSON.stringify(anonTxs));
              if (hasGuestTransactions && oldUserId && oldUserId !== newUserId) {
                const { error: migrationError, data: migrationData } = await supabase.rpc("migrate_transactions", {
                  old_user_id: oldUserId,
                  new_user_id: newUserId,
                });
                console.log("Migration result:", migrationData, migrationError?.message);
              } else {
                console.log("Migration skipped - reason:", !hasGuestTransactions ? "no guest transactions" : oldUserId === newUserId ? "same user" : "no oldUserId");
              }
              setSession(newSession);
              Alert.alert("Synced!", "Signed in and all your transactions have been moved to your Google account.");
            }
          }
        }
      } catch (e) {
        Alert.alert("Error", e.message);
      }
    };

    // Skip linkIdentity entirely — go straight to sign in + migrate
    Alert.alert(
      "Link Google Account",
      "Sign in with Google to save your data to the cloud. Your existing transactions will be synced.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In & Sync", onPress: doSignInWithGoogle },
      ]
    );
  };

  const displayName = isGuest
    ? "Guest User"
    : session?.user?.user_metadata?.full_name ?? session?.user?.email ?? "User";

  const initials = isGuest
    ? "G"
    : (session?.user?.user_metadata?.full_name?.[0] ?? session?.user?.email?.[0] ?? "?").toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── AVATAR CARD ── */}
        <AnimatedRow delay={60}>
          <View style={[styles.avatarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <View style={[styles.avatar, { backgroundColor: theme.accent + "18" }]}>
                <Text style={[styles.avatarInitial, { color: theme.accent }]}>{initials}</Text>
              </View>
            </Animated.View>

            <View style={styles.avatarInfo}>
              <Text style={[styles.avatarName, { color: theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={[styles.badge, { backgroundColor: isGuest ? theme.danger + "12" : theme.success + "12" }]}>
                <View style={[styles.badgeDot, { backgroundColor: isGuest ? theme.danger : theme.success }]} />
                <Text style={[styles.badgeText, { color: isGuest ? theme.danger : theme.success }]}>
                  {isGuest ? "Local only" : "Cloud synced"}
                </Text>
              </View>
            </View>

            <View style={[styles.editBtn, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name="pencil" size={14} color={theme.subText} />
            </View>
          </View>
        </AnimatedRow>

        {/* ── STATS ROW ── */}
        <AnimatedRow delay={120} style={styles.statsRow}>
          <StatPill icon="trending-up-outline" label="Income" value={`${currency}${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color={theme.success} theme={theme} />
          <StatPill icon="trending-down-outline" label="Spent" value={`${currency}${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color={theme.danger} theme={theme} />
          <StatPill icon="wallet-outline" label="Balance" value={`${currency}${Math.abs(totalIncome - totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color={theme.accent} theme={theme} />
        </AnimatedRow>

        {/* ── PREFERENCES ── */}
        <AnimatedRow delay={180}>
          <SectionHeader label="Preferences" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingItem
              icon="cash-outline"
              iconBg={theme.success + "15"}
              iconColor={theme.success}
              label="Currency"
              theme={theme}
              right={
                <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
                  {["₱", "$", "€"].map((cur) => (
                    <TouchableOpacity
                      key={cur}
                      onPress={() => setCurrency(cur)}
                      style={[
                        styles.segBtn,
                        currency === cur && { backgroundColor: theme.surface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
                      ]}
                    >
                      <Text style={[styles.segBtnText, { color: currency === cur ? theme.accent : theme.subText }]}>
                        {cur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
          </View>
        </AnimatedRow>

        {/* ── ACCOUNT ACTIONS ── */}
        <AnimatedRow delay={300}>
          <SectionHeader label="Account" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {isGuest && (
              <PressableRow onPress={handleMergeGoogle}>
                <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: "#DB443515" }]}>
                      <Ionicons name="logo-google" size={17} color="#DB4435" />
                    </View>
                    <View>
                      <Text style={[styles.settingText, { color: theme.text }]}>Link Google</Text>
                      <Text style={[styles.settingSubText, { color: theme.subText }]}>Save data to cloud</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                </View>
              </PressableRow>
            )}

            <PressableRow onPress={() => router.push("/helpsupport")}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.warning + "15" }]}>
                    <Ionicons name="help-circle-outline" size={17} color={theme.warning} />
                  </View>
                  <View>
                    <Text style={[styles.settingText, { color: theme.text }]}>Help & Support</Text>
                    <Text style={[styles.settingSubText, { color: theme.subText }]}>FAQs and contact</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.subText} />
              </View>
            </PressableRow>
          </View>
        </AnimatedRow>

        {/* ── LOGOUT ── */}
        <AnimatedRow delay={360}>
          <PressableRow onPress={handleLogout}>
            <View style={[styles.logoutBtn, { backgroundColor: theme.danger + "0d", borderColor: theme.danger + "25" }]}>
              <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              <Text style={[styles.logoutText, { color: theme.danger }]}>Sign Out</Text>
            </View>
          </PressableRow>
        </AnimatedRow>

        {/* ── VERSION ── */}
        <AnimatedRow delay={400}>
          <Text style={[styles.version, { color: theme.subText }]}>
            Money Tracker · v1.0.0
          </Text>
        </AnimatedRow>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 8,
  },

  // Avatar Card
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2, marginBottom: 5 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  editBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },

  // Setting Row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingRight: {},
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  settingText: { fontSize: 14, fontWeight: "600" },
  settingSubText: { fontSize: 11, fontWeight: "500", marginTop: 1 },

  // Segmented Control
  segmented: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
    gap: 2,
  },
  segBtn: {
    width: 34,
    height: 28,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  segBtnText: { fontSize: 13, fontWeight: "800" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  logoutText: { fontSize: 14, fontWeight: "700" },

  // Version
  version: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 20,
    letterSpacing: 0.3,
  },
});