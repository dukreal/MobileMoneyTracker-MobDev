import { useLocalSearchParams } from "expo-router";
import DetailsScreen from "../src/screens/DetailsScreen";

export default function DetailsRoute() {
  const params = useLocalSearchParams();
  
  if (!params?.item) return null;
  
  let item;
  try {
    item = typeof params.item === "string" ? JSON.parse(params.item) : params.item;
  } catch (e) {
    return null;
  }

  return <DetailsScreen item={item} />;
}