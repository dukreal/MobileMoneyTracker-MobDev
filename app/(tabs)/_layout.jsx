import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../src/store/useStore";

export default function TabsLayout() {
  const { isDarkMode } = useStore();

  const bgColor = isDarkMode ? "#121212" : "#ffffff";
  const textColor = isDarkMode ? "#ffffff" : "#000000";

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "index") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else if (route.name === "add") {
            iconName = focused ? "add-circle" : "add-circle-outline";
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
          backgroundColor: bgColor,
          borderTopColor: isDarkMode ? "#333" : "#eee",
          elevation: 0,
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
