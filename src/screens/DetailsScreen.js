import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  Linking,
  Alert,
  Share,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useStore } from "../store/useStore";
import { supabase } from "../supabase/supabaseClient";

export default function DetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const { isDarkMode, currency } = useStore();
  const [fullImage, setFullImage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const isIncome = item.type === "income";

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#888888" : "#999999",
    card: isDarkMode ? "#1e1e1e" : "#f5f5f5",
    accent: isIncome ? "#2ECC71" : "#FF6B6B",
    border: isDarkMode ? "#2c2c2c" : "#eeeeee",
  };

  const handleDelete = async () => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("transactions")
              .delete()
              .eq("id", item.id);
            if (error) {
              Alert.alert("Error", "Could not delete: " + error.message);
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  const openInMaps = () => {
    if (!item.latitude || !item.longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Transaction: ${item.sub_category}\nAmount: ${currency}${item.amount}\nNote: ${item.notes || "None"}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card }]}
            onPress={handleShare}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate("EditScreen", { item })}
          >
            <Ionicons name="create-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: "#FF6B6B22" }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* AMOUNT HERO */}
        <View style={[styles.amountHero, { backgroundColor: theme.card }]}>
          <View
            style={[styles.typePill, { backgroundColor: theme.accent + "22" }]}
          >
            <Text style={[styles.typeText, { color: theme.accent }]}>
              {isIncome ? "↑ INCOME" : "↓ EXPENSE"}
            </Text>
          </View>
          <Text style={[styles.mainAmount, { color: theme.text }]}>
            {isIncome ? "+" : "-"}
            {currency}
            {item.amount
              ? item.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : "0.00"}
          </Text>
          <Text style={[styles.categoryLabel, { color: theme.subText }]}>
            {item.parent_category} • {item.sub_category}
          </Text>
          <Text style={[styles.dateLabel, { color: theme.subText }]}>
            {item.created_at
              ? format(new Date(item.created_at), "EEEE, MMM d yyyy • h:mm a")
              : "N/A"}
          </Text>

          {item.is_edited && (
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={[styles.editedBadge, { backgroundColor: "#f39c1222" }]}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color="#f39c12"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editedText}>EDITED • VIEW ORIGINAL</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* HISTORY BOX */}
        {showHistory && (
          <View
            style={[
              styles.historyBox,
              {
                backgroundColor: isDarkMode ? "#222" : "#fff9eb",
                borderColor: "#f39c12",
              },
            ]}
          >
            <Text style={styles.historyTitle}>Original Record</Text>
            <Text style={{ color: theme.text, marginTop: 4 }}>
              Amount: {currency}
              {item.original_amount}
            </Text>
            <Text style={{ color: theme.text, marginTop: 2 }}>
              Note: {item.original_notes || "None"}
            </Text>
          </View>
        )}

        {/* NOTES */}
        {item.notes ? (
          <View
            style={[
              styles.notesCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.notesHeader}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.subText}
              />
              <Text style={[styles.notesLabel, { color: theme.subText }]}>
                NOTE
              </Text>
            </View>
            <Text style={[styles.notesValue, { color: theme.text }]}>
              {item.notes}
            </Text>
          </View>
        ) : null}

        {/* LOCATION */}
        {item.latitude ? (
          <TouchableOpacity
            onPress={openInMaps}
            style={[
              styles.locationCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.locationIconWrap,
                { backgroundColor: "#0081db22" },
              ]}
            >
              <Ionicons name="location" size={20} color="#0081db" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locationLabel, { color: theme.subText }]}>
                LOCATION
              </Text>
              <Text style={[styles.locationCoords, { color: theme.text }]}>
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.subText} />
          </TouchableOpacity>
        ) : null}

        {/* ATTACHMENTS */}
        {item.image_urls && item.image_urls.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.subText }]}>
              ATTACHMENTS • {item.image_urls.length}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {item.image_urls.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setFullImage(url)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* FULL IMAGE MODAL */}
      <Modal visible={!!fullImage} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setFullImage(null)}>
          <Image
            source={{ uri: fullImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setFullImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  container: { flex: 1, paddingHorizontal: 20 },

  // AMOUNT HERO
  amountHero: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    marginBottom: 14,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  typeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  mainAmount: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 8,
  },
  categoryLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  dateLabel: { fontSize: 12, fontWeight: "500" },
  editedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
  },
  editedText: { color: "#f39c12", fontSize: 10, fontWeight: "800" },

  // HISTORY
  historyBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  historyTitle: { fontWeight: "800", color: "#f39c12", fontSize: 13 },

  // NOTES
  notesCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  notesLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  notesValue: { fontSize: 15, fontWeight: "500", lineHeight: 22 },

  // LOCATION
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    gap: 14,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 2,
  },
  locationCoords: { fontSize: 14, fontWeight: "600" },

  // ATTACHMENTS
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  thumbnail: { width: 140, height: 140, borderRadius: 18 },

  // MODAL
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "100%", height: "80%" },
  closeModalBtn: { position: "absolute", top: 50, right: 20 },
});
