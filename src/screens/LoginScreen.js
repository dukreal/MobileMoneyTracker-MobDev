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
      <Text style={styles.title}>Money Tracker</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <View style={{ width: "80%" }}>
          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
            <Text style={styles.googleText}>Sign in with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestSignIn}>
            <Text style={styles.buttonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 50 },
  googleButton: {
    backgroundColor: "#fff", padding: 15, borderRadius: 12,
    borderWidth: 1, borderColor: "#ddd", marginBottom: 15, alignItems: "center",
  },
  googleText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  guestButton: { backgroundColor: "#000", padding: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});