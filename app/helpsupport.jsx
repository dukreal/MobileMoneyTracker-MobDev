import { Stack } from "expo-router";
import HelpSupportScreen from "../src/screens/HelpSupportScreen";

export default function HelpSupportRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HelpSupportScreen />
    </>
  );
}