import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../src/store/useStore";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, TouchableOpacity, StyleSheet } from "react-native";

function AddButton({ onPress, isDarkMode }) {
  return (
    <TouchableOpacity
      style={styles.addButtonWrapper}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.addButton}>
        <Ionicons name="add" size={32} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { isDarkMode } = useStore();
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
        tabBarActiveTintColor: textColor,
        tabBarInactiveTintColor: "gray",
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
          borderTopColor: isDarkMode ? "#333" : "#eee",
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
            <AddButton {...props} isDarkMode={isDarkMode} />
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
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 8 },  
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 14,
  },
});
