import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

// Import Store & Supabase
import { supabase } from "./src/supabase/supabaseClient";
import { useStore } from "./src/store/useStore";

// Import Screens
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AddScreen from "./src/screens/AddScreen";
import ChartsScreen from "./src/screens/ChartsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  const { session, setSession } = useStore();

  useEffect(() => {
    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for ANY changes (including the ones that happen in the browser)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth State Changed:", _event);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. If not logged in, show Login
  if (!session) {
    return <LoginScreen />;
  }

  // 2. If logged in, show the Tab Navigation
  return (
    <NavigationContainer>
      <StatusBar
        style={useStore.getState().isDarkMode ? "light" : "dark"}
        backgroundColor={useStore.getState().isDarkMode ? "#121212" : "#fff"}
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === "Home")
              iconName = focused ? "wallet" : "wallet-outline";
            else if (route.name === "Add")
              iconName = focused ? "add-circle" : "add-circle-outline";
            else if (route.name === "Charts")
              iconName = focused ? "bar-chart" : "bar-chart-outline";
            else if (route.name === "Profile")
              iconName = focused ? "person" : "person-outline";
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          // --- DARK MODE NAVIGATION SETTINGS ---
          tabBarActiveTintColor: useStore.getState().isDarkMode
            ? "#fff"
            : "#000",
          tabBarInactiveTintColor: "gray",
          tabBarStyle: {
            backgroundColor: useStore.getState().isDarkMode
              ? "#121212"
              : "#fff",
            borderTopColor: useStore.getState().isDarkMode ? "#333" : "#eee",
          },
          headerStyle: {
            backgroundColor: useStore.getState().isDarkMode
              ? "#121212"
              : "#fff",
            elevation: 0,
            shadowOpacity: 0, // Removes line under header
          },
          headerTintColor: useStore.getState().isDarkMode ? "#fff" : "#000",
          // -------------------------------------
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerShown: false
          }}
        />
        <Tab.Screen name="Add" component={AddScreen} />
        <Tab.Screen name="Charts" component={ChartsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
