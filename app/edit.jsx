import { useLocalSearchParams } from "expo-router";
import EditScreen from "../src/screens/EditScreen";

export default function EditRoute() {
  const params = useLocalSearchParams();

  if (!params?.item) return null;

  let item;
  try {
    item = typeof params.item === "string" ? JSON.parse(params.item) : params.item;
  } catch (e) {
    return null;
  }

  return <EditScreen item={item} />;
}