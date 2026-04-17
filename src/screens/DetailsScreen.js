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
  Alert, // Added Alert
  Share,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useStore } from "../store/useStore";
import { supabase } from "../supabase/supabaseClient"; // IMPORTANT: Add this import

export default function DetailsScreen({ route, navigation }) {
  const { item } = route.params;
  const { isDarkMode, currency } = useStore();
  const [fullImage, setFullImage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#888888" : "#666666",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    accent: "#0081db",
    border: isDarkMode ? "#2c2c2c" : "#f0f0f0",
  };

  // --- NEW DELETE LOGIC ---
  const handleDelete = async () => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this transaction? This cannot be undone.",
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
              // goBack() returns to HomeScreen.
              // HomeScreen's useFocusEffect will automatically refresh the list.
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

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()} // Changed to goBack for better animation
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Transaction Details
        </Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.amountHeader}>
          <Text
            style={[
              styles.typeLabel,
              { color: item.type === "income" ? "#34c759" : "#ff3b30" },
            ]}
          >
            {item.type ? item.type.toUpperCase() : "TRANSACTION"}
          </Text>
          <Text style={[styles.mainAmount, { color: theme.text }]}>
            {item.type === "income" ? "+" : "-"}
            {currency}
            {item.amount
              ? item.amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : "0.00"}
          </Text>

          {item.is_edited ? (
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={styles.editedBadge}
            >
              <Text style={styles.editedText}>EDITED • VIEW ORIGINAL</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {showHistory ? (
          <View
            style={[
              styles.historyBox,
              {
                backgroundColor: isDarkMode ? "#222" : "#fff9eb",
                borderColor: "#f39c12",
              },
            ]}
          >
            <Text style={styles.historyTitle}>Original Record:</Text>
            <Text style={{ color: theme.text }}>
              Amount: {currency}
              {item.original_amount}
            </Text>
            <Text style={{ color: theme.text }}>
              Note: {item.original_notes || "None"}
            </Text>
          </View>
        ) : null}

        <View style={[styles.detailsCard, { backgroundColor: theme.card }]}>
          <DetailRow
            icon="grid-outline"
            label="Category"
            value={item.sub_category || "Uncategorized"}
            theme={theme}
          />
          <DetailRow
            icon="time-outline"
            label="Date & Time"
            value={
              item.created_at
                ? format(new Date(item.created_at), "PPP p")
                : "N/A"
            }
            theme={theme}
          />
          <DetailRow
            icon="document-text-outline"
            label="Notes"
            value={item.notes || "No notes added"}
            theme={theme}
            isLast
          />
        </View>

        {item.image_urls && item.image_urls.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Attachments
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imageGrid}>
                {item.image_urls.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setFullImage(url)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {item.latitude ? (
            <TouchableOpacity
              style={[styles.circleBtn, { backgroundColor: theme.accent }]}
              onPress={openInMaps}
            >
              <Ionicons name="map" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: "#4A90E2" }]}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: "#f39c12" }]}
            onPress={() =>
              Alert.alert("Coming Soon", "Edit is not implemented.")
            }
          >
            <Ionicons name="create" size={22} color="#fff" />
          </TouchableOpacity>

          {/* UPDATED DELETE BUTTON */}
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: "#e74c3c" }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Modal visible={!!fullImage} transparent={true} animationType="fade">
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
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </Pressable>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailRow = ({ icon, label, value, theme, isLast }) => (
  <View style={[styles.detailRow, isLast && { marginBottom: 0 }]}>
    <View style={styles.iconWrapper}>
      <Ionicons name={icon} size={22} color={theme.subText} />
    </View>
    <View style={styles.detailTextContainer}>
      <Text style={[styles.detailLabel, { color: theme.subText }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: 8,
  },
  backButton: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  container: { flex: 1, paddingHorizontal: 20 },
  amountHeader: { alignItems: "center", marginTop: 30, marginBottom: 40 },
  typeLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  mainAmount: { fontSize: 52, fontWeight: "900", letterSpacing: -1 },
  editedBadge: {
    backgroundColor: "#f39c12",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  editedText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  historyBox: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
  },
  historyTitle: { fontWeight: "bold", color: "#f39c12", marginBottom: 5 },
  detailsCard: { padding: 25, borderRadius: 30, marginBottom: 30 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 25,
  },
  iconWrapper: { width: 30, alignItems: "center", marginTop: 2 },
  detailTextContainer: { marginLeft: 15, flex: 1 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailValue: { fontSize: 16, fontWeight: "500", lineHeight: 22 },
  section: { marginBottom: 35 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 15 },
  imageGrid: { flexDirection: "row", paddingRight: 20 },
  thumbnail: { width: 100, height: 100, borderRadius: 20, marginRight: 12 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginTop: 10,
  },
  circleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowOpacity: 0.2,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "100%", height: "80%" },
  closeModalBtn: { position: "absolute", top: 50, right: 25, padding: 10 },
});
