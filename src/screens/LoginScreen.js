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
    // Listen for deep links while app is open
    const handleDeepLink = async (event) => {
      console.log("Deep link received:", event.url);
      const url = event.url;

      if (!url) return;

      const fragment = url.split("#")[1];
      const query = url.split("?")[1]?.split("#")[0];

      let params = {};
      if (fragment) params = Object.fromEntries(new URLSearchParams(fragment));
      if (!params.access_token && query)
        params = Object.fromEntries(new URLSearchParams(query));

      console.log("Deep link params keys:", Object.keys(params));

      if (params.access_token && params.refresh_token) {
        const { data: sd, error: se } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (se) {
          Alert.alert("Login Error", se.message);
          return;
        }
        setSession(sd.session);
        setLoading(false);
        return;
      }

      if (params.code) {
        const { data: ex, error: ee } =
          await supabase.auth.exchangeCodeForSession(params.code);
        if (ee) {
          Alert.alert("Login Error", ee.message);
          return;
        }
        setSession(ex.session);
        setLoading(false);
        return;
      }
    };

    // Also check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log("Initial URL:", url);
        handleDeepLink({ url });
      }
    });

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "com.moneytracker.app",
      });
      console.log("Redirect URI:", redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUri,
        },
      });

      if (error) throw error;

      console.log("Opening URL:", data.url);

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri,
      );

      console.log("Browser result:", JSON.stringify(result));

      // If success, deep link listener above will handle it
      // If dismiss, check session directly
      if (result.type === "dismiss" || result.type === "cancel") {
        const { data: current } = await supabase.auth.getSession();
        console.log("Session after dismiss:", current?.session ? "FOUND" : "null");
        if (current?.session) {
          setSession(current.session);
        } else {
          setLoading(false);
        }
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Login Error", error.message);
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
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
          >
            <Text style={styles.googleText}>Sign in with Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestSignIn}
          >
            <Text style={styles.buttonText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 50 },
  googleButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    alignItems: "center",
  },
  googleText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  guestButton: {
    backgroundColor: "#000",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});