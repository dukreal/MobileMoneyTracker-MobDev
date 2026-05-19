import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../src/store/useStore";
import { ACCENT_COLORS } from "../../src/constants/settings";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, TouchableOpacity, StyleSheet } from "react-native";

function AddButton({ onPress, accentColor }) {
  return (
    <TouchableOpacity
      style={styles.addButtonWrapper}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.addButton, { backgroundColor: accentColor, shadowColor: accentColor }]}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { isDarkMode, colorTheme } = useStore();
  const accentColor = ACCENT_COLORS[colorTheme] ?? "#3B7DD8";
  const insets = useSafeAreaInsets();

  const bgColor = isDarkMode ? "#121212" : "#ffffff";
  const textColor = isDarkMode ? "#ffffff" : "#000000";
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: bgColor }}
      screenOptions={({ route }) => ({
        lazy: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "index") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else if (route.name === "search") {
            iconName = focused ? "search" : "search-outline";
          } else if (route.name === "analytics") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
          borderTopColor: isDarkMode ? "#333" : "#d8d8d4",
          elevation: 0,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom || 10,
          paddingTop: 5,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <AddButton {...props} accentColor={accentColor} />
          ),
        }}
      />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addButtonWrapper: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  addButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 8 },  
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 14,
  },
});
