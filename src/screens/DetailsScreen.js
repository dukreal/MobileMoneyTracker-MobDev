import React, { useState, useRef } from "react";
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
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";

export default function DetailsScreen({ item }) {
  const { isDarkMode, currency } = useStore();
  const [fullImage, setFullImage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const receiptRef = useRef(null);

  const isIncome = item.type === "income";
  const accentColor = isIncome ? "#2ECC71" : "#FF6B6B";

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#888888" : "#999999",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    border: isDarkMode ? "#2c2c2c" : "#f0f0f0",
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
              router.back();
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

  const handleShareImage = async () => {
    try {
      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share Transaction Receipt",
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not generate image.");
    }
  };

  const handleShareLink = async () => {
    try {
      const link = `https://yrqvncdwnzuruohgmfup.supabase.co/functions/v1/share-transaction?id=${item.id}`;
      await Share.share({ message: link });
    } catch (e) {
      console.log(e);
    }
  };

  const handleShare = () => {
    Alert.alert("Share Transaction", "Choose a format", [
      { text: "Share as Image", onPress: handleShareImage },
      { text: "Share as Link", onPress: handleShareLink },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={[styles.mainWrapper, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.circleIconBtn,
            { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Details</Text>

        <TouchableOpacity
          onPress={handleShare}
          style={[
            styles.circleIconBtn,
            { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
          ]}
        >
          <Ionicons name="share-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {/* HERO CARD */}
        <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
          {/* Type pill */}
          <View style={[styles.typePill, { backgroundColor: accentColor + "22" }]}>
            <Ionicons
              name={isIncome ? "arrow-up" : "arrow-down"}
              size={11}
              color={accentColor}
            />
            <Text style={[styles.typeText, { color: accentColor }]}>
              {isIncome ? "INCOME" : "EXPENSE"}
            </Text>
          </View>

          {/* Amount */}
          <Text style={[styles.mainAmount, { color: theme.text }]}>
            {isIncome ? "+" : "-"}{currency}
            {item.amount
              ? Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
              : "0.00"}
          </Text>

          {/* Category */}
          <Text style={[styles.categoryText, { color: theme.subText }]}>
            {item.parent_category}  ›  {item.sub_category}
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Date + Time */}
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="calendar-outline" size={13} color={theme.subText} />
              <Text style={[styles.heroMetaText, { color: theme.subText }]}>
                {item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "N/A"}
              </Text>
            </View>
            <View style={[styles.heroMetaDot, { backgroundColor: theme.border }]} />
            <View style={styles.heroMetaItem}>
              <Ionicons name="time-outline" size={13} color={theme.subText} />
              <Text style={[styles.heroMetaText, { color: theme.subText }]}>
                {item.created_at ? format(new Date(item.created_at), "h:mm a") : "N/A"}
              </Text>
            </View>
          </View>

          {/* Edited badge */}
          {item.is_edited && (
            <TouchableOpacity
              onPress={() => setShowHistory(!showHistory)}
              style={styles.editedBadge}
            >
              <Ionicons name="time-outline" size={11} color="#f39c12" />
              <Text style={styles.editedText}>EDITED • TAP TO VIEW ORIGINAL</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* HISTORY BOX */}
        {showHistory && (
          <View
            style={[
              styles.infoCard,
              { backgroundColor: isDarkMode ? "#1e1200" : "#fff9eb", borderColor: "#f39c1244" },
            ]}
          >
            <View style={styles.infoCardHeader}>
              <Ionicons name="time-outline" size={14} color="#f39c12" />
              <Text style={[styles.infoCardLabel, { color: "#f39c12" }]}>ORIGINAL RECORD</Text>
            </View>
            <View style={styles.historyRow}>
              <Text style={[styles.historyKey, { color: theme.subText }]}>Amount</Text>
              <Text style={[styles.historyVal, { color: theme.text }]}>
                {currency}{Number(item.original_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.historyRow}>
              <Text style={[styles.historyKey, { color: theme.subText }]}>Note</Text>
              <Text style={[styles.historyVal, { color: theme.text }]}>
                {item.original_notes || "None"}
              </Text>
            </View>
          </View>
        )}

        {/* NOTES */}
        {item.notes ? (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="document-text-outline" size={14} color={theme.subText} />
              <Text style={[styles.infoCardLabel, { color: theme.subText }]}>NOTE</Text>
            </View>
            <Text style={[styles.infoCardValue, { color: theme.text }]}>{item.notes}</Text>
          </View>
        ) : null}

        {/* LOCATION */}
        {item.latitude ? (
          <TouchableOpacity
            onPress={openInMaps}
            activeOpacity={0.7}
            style={[styles.infoCard, styles.infoCardRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={[styles.infoIconCircle, { backgroundColor: "#0081db22" }]}>
              <Ionicons name="location" size={18} color="#0081db" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardLabel, { color: theme.subText }]}>LOCATION</Text>
              <Text style={[styles.infoCardValue, { color: theme.text }]}>
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={theme.subText} />
          </TouchableOpacity>
        ) : null}

        {/* ATTACHMENTS */}
        {item.image_urls && item.image_urls.length > 0 && (
          <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.infoCardHeader}>
              <Ionicons name="images-outline" size={14} color={theme.subText} />
              <Text style={[styles.infoCardLabel, { color: theme.subText }]}>
                ATTACHMENTS • {item.image_urls.length}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                {item.image_urls.map((url, index) => (
                  <TouchableOpacity key={index} onPress={() => setFullImage(url)} activeOpacity={0.85}>
                    <Image source={{ uri: url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={[styles.actionBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        {item.latitude && (
          <TouchableOpacity style={styles.actionBtn} onPress={openInMaps}>
            <View style={[styles.actionIcon, { backgroundColor: "#0081db22" }]}>
              <Ionicons name="map" size={22} color="#0081db" />
            </View>
            <Text style={[styles.actionLabel, { color: theme.subText }]}>Map</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <View style={[styles.actionIcon, { backgroundColor: "#4A90E222" }]}>
            <Ionicons name="share-social" size={22} color="#4A90E2" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: "/edit", params: { item: JSON.stringify(item) } })}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#f39c1222" }]}>
            <Ionicons name="create" size={22} color="#f39c12" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <View style={[styles.actionIcon, { backgroundColor: "#FF6B6B22" }]}>
            <Ionicons name="trash" size={22} color="#FF6B6B" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* FULL IMAGE MODAL */}
      <Modal visible={!!fullImage} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setFullImage(null)}>
          <Image source={{ uri: fullImage }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setFullImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* HIDDEN RECEIPT FOR SCREENSHOT */}
      <View style={{ position: "absolute", left: -9999, top: -9999 }}>
        <ViewShot ref={receiptRef} options={{ format: "png", quality: 1 }}>
          <View style={{ backgroundColor: "#fff", padding: 32, width: 340, borderRadius: 24 }}>
            <Text style={{ textAlign: "center", fontSize: 13, fontWeight: "700", color: "#999", letterSpacing: 1.5, marginBottom: 20 }}>
              TRANSACTION RECEIPT
            </Text>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: accentColor, letterSpacing: 1.5, marginBottom: 8 }}>
                {isIncome ? "↑ INCOME" : "↓ EXPENSE"}
              </Text>
              <Text style={{ fontSize: 44, fontWeight: "900", color: "#000", letterSpacing: -1 }}>
                {isIncome ? "+" : "-"}{currency}
                {item.amount ? Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </Text>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: "#eee", paddingTop: 20, gap: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#999", fontSize: 13 }}>Category</Text>
                <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>{item.parent_category} › {item.sub_category}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#999", fontSize: 13 }}>Date</Text>
                <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>{item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "N/A"}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#999", fontSize: 13 }}>Time</Text>
                <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>{item.created_at ? format(new Date(item.created_at), "h:mm a") : "N/A"}</Text>
              </View>
              {item.notes ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#999", fontSize: 13 }}>Note</Text>
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" }}>{item.notes}</Text>
                </View>
              ) : null}
              {item.latitude ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#999", fontSize: 13 }}>Location</Text>
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "600" }}>
                    {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                  </Text>
                </View>
              ) : null}
            </View>
            {item.image_urls && item.image_urls.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: "#999", fontSize: 13, marginBottom: 10 }}>Attachments</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {item.image_urls.map((url, index) => (
                    <Image key={index} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                  ))}
                </View>
              </View>
            )}
            <Text style={{ textAlign: "center", color: "#ccc", fontSize: 11, marginTop: 24 }}>
              Generated by Montra
            </Text>
          </View>
        </ViewShot>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },

  // HERO CARD
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  typeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  mainAmount: { fontSize: 42, fontWeight: "900", letterSpacing: -1, marginBottom: 6 },
  categoryText: { fontSize: 13, fontWeight: "500" },
  divider: { width: "100%", height: 1, marginVertical: 16 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaDot: { width: 4, height: 4, borderRadius: 2 },
  heroMetaText: { fontSize: 13, fontWeight: "500" },
  editedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 14,
    backgroundColor: "#f39c1222",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editedText: { color: "#f39c12", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  // INFO CARDS
  infoCard: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1 },
  infoCardRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  infoCardLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  infoCardValue: { fontSize: 15, fontWeight: "500", lineHeight: 22 },
  infoIconCircle: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center" },

  // HISTORY
  historyRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  historyKey: { fontSize: 13 },
  historyVal: { fontSize: 13, fontWeight: "600" },

  // ATTACHMENTS
  thumbnail: { width: 110, height: 110, borderRadius: 14 },

  // BOTTOM ACTION BAR
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  actionBtn: { alignItems: "center", gap: 6, flex: 1 },
  actionIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 12, fontWeight: "600" },

  // MODAL
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "100%", height: "80%" },
  closeModalBtn: { position: "absolute", top: 50, right: 20 },
});