import { Stack } from "expo-router";
import { useStore } from "../src/store/useStore";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const { isDarkMode } = useStore();
  const bgColor = isDarkMode ? "#121212" : "#ffffff";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        <StatusBar
          style={isDarkMode ? "light" : "dark"}
          backgroundColor={bgColor}
          translucent={false}
        />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: bgColor },
            animation: "slide_from_right",
            headerShown: false,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            freezeOnBlur: false, // FALSE — this is what caused the blank text bug
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="details" options={{ headerShown: false }} />
          <Stack.Screen name="edit" options={{ headerShown: false }} />
          <Stack.Screen name="search" options={{ headerShown: false }} />
        </Stack>
      </View>
    </GestureHandlerRootView>
  );
}