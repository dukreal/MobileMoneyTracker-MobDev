// 1. MUST BE LINE 1
import 'react-native-gesture-handler'; 

import { Stack, SplashScreen } from "expo-router";
import { useStore } from "../src/store/useStore";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect } from "react";
import { supabase } from "../src/supabase/supabaseClient";
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

// Prevent splash screen from hiding until store is ready
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDarkMode, _hasHydrated, session, setSession } = useStore();
  const bgColor = isDarkMode ? "#121212" : "#ffffff";
  const [authReady, setAuthReady] = React.useState(false);
  const router = require('expo-router').useRouter();

  useEffect(() => {
    if (_hasHydrated) {
      SplashScreen.hideAsync();
    }
  }, [_hasHydrated]);

  useEffect(() => {
    // Always verify session with Supabase first
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthReady(true);
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log("Layout auth change:", _event, currentSession ? "HAS SESSION" : "NO SESSION");
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!authReady || !_hasHydrated) return;
    if (!session) {
      router.replace('/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [session, authReady, _hasHydrated]);
  
  // Wait for both store hydration AND Supabase session check
  if (!_hasHydrated || !authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 
         FIX: Removing the manual background View here often solves 
         Android layout overlap issues because NavigationContainer 
         handles the screen height better on its own.
      */}
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
        backgroundColor={bgColor}
        // Change translucent to true so the system handles the 
        // spacing between the app and the nav bar correctly.
        translucent={true} 
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
        <Stack.Screen name="search" options={{ presentation: "transparentModal" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}