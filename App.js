import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack"; // ADDED
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { DefaultTheme, DarkTheme } from "@react-navigation/native";
import { View } from "react-native";

// Import Store & Supabase
import { useStore } from "./src/store/useStore";

// Import Screens
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AddScreen from "./src/screens/AddScreen";
import ChartsScreen from "./src/screens/ChartsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import DetailsScreen from "./src/screens/DetailsScreen";

// import EditScreen from "./src/screens/EditScreen"; // We will create this next

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator(); // ADDED

// --- THIS COMPONENT HOLDS YOUR BOTTOM TABS ---
function MainTabs() {
  const isDarkMode = useStore((state) => state.isDarkMode);

  // Define the background color once to ensure consistency
  const bgColor = isDarkMode ? "#121212" : "#fff";
  const textColor = isDarkMode ? "#fff" : "#000";

  return (
    <Tab.Navigator
      // This property is the MOST important for fixing the white flash.
      // It sets the background of the underlying view that holds the screens.
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={({ route }) => ({
        // ICON LOGIC
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "wallet" : "wallet-outline";
          } else if (route.name === "Add") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Charts") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },

        // COLORS & THEMING
        tabBarActiveTintColor: textColor,
        tabBarInactiveTintColor: "gray",

        // TAB BAR STYLE
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: isDarkMode ? "#333" : "#eee",
          elevation: 0, // Removes shadow on Android
          borderTopWidth: 1,
        },

        // HEADER STYLE
        headerStyle: {
          backgroundColor: bgColor,
          elevation: 0, // Removes shadow on Android
          shadowOpacity: 0, // Removes shadow on iOS
          borderBottomWidth: 0, // Keeps header clean
        },
        headerTintColor: textColor,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false, // HomeScreen has its own custom header
        }}
      />
      <Tab.Screen name="Add" component={AddScreen} options={{ title: "Add" }} />
      <Tab.Screen
        name="Charts"
        component={ChartsScreen}
        options={{ title: "Analytics" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Settings" }}
      />
    </Tab.Navigator>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const { isDarkMode } = useStore();

  // The magic color that must match your screen background
  const bgColor = isDarkMode ? "#121212" : "#ffffff";

  const MyTheme = {
    ...(isDarkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDarkMode ? DarkTheme.colors : DefaultTheme.colors),
      background: bgColor, // This sets the theme background
      card: bgColor, // This sets the header background
    },
  };

  return (
    // CHANGE 1: Wrap in a View with the theme color
    <View style={{ flex: 1, backgroundColor: bgColor, overflow: "hidden" }}>
      <NavigationContainer theme={MyTheme}>
        <StatusBar
          style={isDarkMode ? "light" : "dark"}
          backgroundColor={bgColor}
        />

        <Stack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: isDarkMode ? "#121212" : "#fff" },
            animation: "slide_from_right",
            headerStyle: { backgroundColor: isDarkMode ? "#121212" : "#fff" },
            headerTintColor: isDarkMode ? "#fff" : "#000",
            headerShadowVisible: false,
            freezeOnBlur: false,
            detachPreviousScreen: false,
            cardOverlayEnabled: false,
            cardStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={{
              headerShown: false,
              animation: "slide_from_right",
              animationTypeForReplace: "push",
              gestureEnabled: false,
              contentStyle: {
                backgroundColor: isDarkMode ? "#121212" : "#fff",
              },
              freezeOnBlur: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
