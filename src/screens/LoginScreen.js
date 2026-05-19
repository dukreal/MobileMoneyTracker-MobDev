import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { useStore } from "../store/useStore";
import { Image } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { setSession } = useStore();

  useEffect(() => {
    // Handle deep link when app comes back from browser
    const handleDeepLink = async ({ url }) => {
      if (!url) return;
      console.log("Deep link received:", url);
      if (url.includes("error_code=")) return;

      // Extract code or tokens from URL
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get("code") 
        || new URLSearchParams(url.split("#")[1]).get("code");
      const access_token = new URLSearchParams(url.split("#")[1]).get("access_token");
      const refresh_token = new URLSearchParams(url.split("#")[1]).get("refresh_token");

      if (code) {
        console.log("Got code, exchanging for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { Alert.alert("Login Error", error.message); setLoading(false); return; }
        setSession(data.session);
        setLoading(false);
        return;
      }

      if (access_token && refresh_token) {
        console.log("Got tokens, setting session...");
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) { Alert.alert("Login Error", error.message); setLoading(false); return; }

        const newSession = data.session;
        console.log("New session is_anonymous:", newSession?.user?.is_anonymous);
        console.log("New session user id:", newSession?.user?.id);

        // Run pending migration if guest was syncing
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const pendingOldUserId = await AsyncStorage.getItem("pending_migration_user_id");
        const newUserId = newSession?.user?.id;
        if (pendingOldUserId && newUserId && pendingOldUserId !== newUserId) {
          console.log("Running migration:", pendingOldUserId, "->", newUserId);
          await supabase.rpc("migrate_transactions", {
            old_user_id: pendingOldUserId,
            new_user_id: newUserId,
          });
          await AsyncStorage.removeItem("pending_migration_user_id");
        }

        // Force clear old anonymous session from AsyncStorage before setting new one
        await AsyncStorage.removeItem("supabase.auth.token");

        setSession(newSession);
        setLoading(false);
        return;
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was launched via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url !== "exp://192.168.8.241:8081") {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  // Also listen via Supabase auth state (catches session from _layout.jsx)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? "HAS SESSION" : "NO SESSION");
      if (session) {
        setSession(session);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo: AuthSession.makeRedirectUri({ useProxy: true }),
      },
    });

    if (error) throw error;

    console.log("Opening browser...", data.url);

    const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
    console.log("Proxy redirect URI:", redirectUri);

   const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri,
      {
        preferEphemeralSession: true,
        showInRecents: false,
        createTask: false,
      }
    );

    console.log("Auth result:", JSON.stringify(result));

    if (result.type === "success" && result.url) {
      const url = result.url;
      const fragment = url.split("#")[1] || "";
      const query = url.split("?")[1]?.split("#")[0] || "";
      const params = new URLSearchParams(fragment || query);
      const code = new URLSearchParams(query).get("code") || params.get("code");
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      console.log("Parsed params - code:", code, "access_token:", !!access_token);

      if (code) {
        const { data: ex, error: ee } = await supabase.auth.exchangeCodeForSession(code);
        if (ee) { Alert.alert("Error", ee.message); return; }
        setSession(ex.session);
      } else if (access_token && refresh_token) {
        const { data: sd, error: se } = await supabase.auth.setSession({ access_token, refresh_token });
        if (se) { Alert.alert("Error", se.message); return; }
        setSession(sd.session);
      }
    } else {
      console.log("Auth cancelled or failed:", result.type);
      // Check session anyway in case onAuthStateChange already caught it
      const { data: current } = await supabase.auth.getSession();
      if (!current?.session) setLoading(false);
    }

  } catch (error) {
    console.error("Login error:", error);
    Alert.alert("Login Error", error.message);
  } finally {
    setLoading(false);
  }
};

  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setSession(data.session);
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background subtle grid */}
      <View style={styles.bgGrid} />

      {/* Logo area */}
      <View style={{ width: "100%", alignItems: "center" }}>
      <View style={styles.logoArea}>
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 130, height: 130 }}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Montra</Text>
      </View>

      {/* Buttons */}
      {loading ? (
        <ActivityIndicator size="large" color="#3B7DD8" style={{ marginTop: 48 }} />
      ) : (
        <View style={styles.btnGroup}>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} activeOpacity={0.85}>
            <View style={styles.googleInner}>
              <Image
                source={require("../../assets/google-logo.png")}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
              <Text style={styles.googleText}>Continue with Google</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.guestButton} onPress={handleGuestSignIn} activeOpacity={0.85}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Guest data is stored locally only.{"\n"}Link Google anytime to back it up.
          </Text>
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // Background decoration
  bgGrid: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.03,
    backgroundColor: "transparent",
  },

  // Logo
  logoArea: {
    alignItems: "center",
    marginBottom: 48,
    width: "100%",
  },
  appName: {
    fontSize: 38,
    fontWeight: "900",
    color: "#f0f0f0",
    letterSpacing: -1,
    marginBottom: 8,
  },

  // Buttons
  btnGroup: {
    width: "100%",
    alignItems: "center",
  },
  googleButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  googleInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#333",
  },
  dividerText: {
    color: "#666",
    fontSize: 13,
    fontWeight: "700",
  },

  // Guest button
  guestButton: {
    width: "100%",
    backgroundColor: "#161616",
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    marginBottom: 24,
  },
  guestText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#888",
  },

  disclaimer: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
});