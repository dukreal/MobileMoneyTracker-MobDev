import React, { useState, useRef, useEffect } from "react";
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
  Pressable,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useStore } from "../store/useStore";
import { initDB, deleteLocalTransaction, enqueuePendingOp } from "../db/localDB";
import { buildTheme } from "../constants/settings";
import { supabase } from "../supabase/supabaseClient";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";

// ─── Animated Row ─────────────────────────────────────────────────────────────
function AnimatedRow({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Pressable Row ────────────────────────────────────────────────────────────
function PressableRow({ onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, theme }) {
  return <Text style={[styles.sectionLabel, { color: theme.subText }]}>{label}</Text>;
}

// ─── Detail Row inside a card ─────────────────────────────────────────────────
function DetailRow({ icon, iconBg, iconColor, label, value, borderBottom, theme, onPress }) {
  const isLong = label === "Note";
  const inner = isLong ? (
    <View style={[styles.settingRowStacked, borderBottom && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={[styles.settingText, { color: theme.text }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValFull, { color: theme.subText }]}>{value}</Text>
    </View>
  ) : (
    <View style={[styles.settingRow, borderBottom && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <Text style={[styles.settingText, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        <Text style={[styles.detailVal, { color: theme.subText }]}>{value}</Text>
        {onPress && <Ionicons name="chevron-forward" size={14} color={theme.subText} style={{ marginLeft: 4 }} />}
      </View>
    </View>
  );

  if (onPress) return <PressableRow onPress={onPress}>{inner}</PressableRow>;
  return inner;
}

export default function DetailsScreen({ item }) {
  const { isDarkMode, currency, colorTheme, isOnline, refreshPendingCount } = useStore();
  const [fullImage, setFullImage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const receiptRef = useRef(null);
  const insets = useSafeAreaInsets();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const barAnim = useRef(new Animated.Value(40)).current;

  const [customModal, setCustomModal] = useState({ visible: false, icon: "alert-circle-outline", iconColor: null, title: "", message: "", buttons: [] });
  const showModal = (icon, iconColor, title, message, buttons) => setCustomModal({ visible: true, icon, iconColor, title, message, buttons });
  const hideModal = () => setCustomModal((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(barAnim, { toValue: 0, damping: 20, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const isIncome = item.type === "income";
  const accentColor = isIncome ? "#2ECC71" : "#FF6B6B";
  const theme = buildTheme(isDarkMode, colorTheme);

  const handleDelete = () => {
    showModal("trash-outline", "#FF6B6B", "Delete Record", "Are you sure you want to delete this transaction? This cannot be undone.", [
      {
        label: "Cancel",
        primary: false,
        onPress: hideModal,
      },
      {
        label: "Delete",
        primary: true,
        onPress: async () => {
          hideModal();
          await initDB();
          if (isOnline) {
            const { error } = await supabase.from("transactions").delete().eq("id", item.id);
            if (error) {
              showModal("alert-circle-outline", "#FF6B6B", "Error", "Could not delete: " + error.message, [{ label: "OK", onPress: hideModal, primary: true }]);
              return;
            }
          } else {
            await deleteLocalTransaction(item.id);
            await enqueuePendingOp(item.id, "DELETE", { id: item.id });
            await refreshPendingCount();
          }
          showModal(
            isOnline ? "checkmark-circle-outline" : "cloud-offline-outline",
            isOnline ? "#2ECC71" : "#f39c12",
            isOnline ? "Deleted" : "Deleted Offline",
            isOnline ? "Transaction removed." : "Removed locally. Will sync when back online.",
            [{ label: "OK", primary: true, onPress: () => { hideModal(); router.push({ pathname: "/(tabs)", params: { jumpToDate: item.created_at } }); } }]
          );
        },
      },
    ]);
  };

  const openInMaps = () => {
    if (!item.latitude || !item.longitude) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`);
  };

  const handleShareImage = async () => {
    try {
      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Transaction Receipt" });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not generate image.");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border, paddingTop: insets.top + 10 },
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(tabs)", params: { jumpToDate: item.created_at } })}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Details</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO CARD ── */}
        <AnimatedRow delay={60}>
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Type pill */}
            <View style={[styles.typePill, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name={isIncome ? "arrow-up" : "arrow-down"} size={11} color={accentColor} />
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
            <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />

            {/* Date + Time row */}
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
                  {item.custom_created_at
                    ? `Custom · ${format(new Date(item.custom_created_at), "MMM d, yyyy")}`
                    : item.created_at
                    ? format(new Date(item.created_at), "h:mm a")
                    : "N/A"}
                </Text>
              </View>
            </View>

            {/* Edited badge */}
            {item.is_edited && (
              <TouchableOpacity
                onPress={() => setShowHistory(!showHistory)}
                style={[styles.editedBadge, { backgroundColor: "#f39c1218" }]}
              >
                <Ionicons name="time-outline" size={11} color="#f39c12" />
                <Text style={styles.editedText}>EDITED · TAP TO VIEW ORIGINAL</Text>
                <Ionicons name={showHistory ? "chevron-up" : "chevron-down"} size={11} color="#f39c12" />
              </TouchableOpacity>
            )}
          </View>
        </AnimatedRow>

        {/* ── ORIGINAL RECORD HISTORY ── */}
        {showHistory && (
          <AnimatedRow delay={0}>
            <SectionHeader label="ORIGINAL RECORD" theme={theme} />
            <View style={[styles.card, { backgroundColor: isDarkMode ? "#1e1200" : "#fff9eb", borderColor: "#f39c1230" }]}>
              <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: "#f39c1230" }]}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#f39c1218" }]}>
                    <Ionicons name="cash-outline" size={17} color="#f39c12" />
                  </View>
                  <Text style={[styles.settingText, { color: theme.text }]}>Amount</Text>
                </View>
                <Text style={[styles.detailVal, { color: "#f39c12" }]}>
                  {currency}{Number(item.original_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#f39c1218" }]}>
                    <Ionicons name="document-text-outline" size={17} color="#f39c12" />
                  </View>
                  <Text style={[styles.settingText, { color: theme.text }]}>Note</Text>
                </View>
                <Text style={[styles.detailVal, { color: theme.subText }]}>
                  {item.original_notes || "None"}
                </Text>
              </View>
            </View>
          </AnimatedRow>
        )}

        {/* ── TRANSACTION INFO ── */}
        <AnimatedRow delay={120}>
          <SectionHeader label="TRANSACTION" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <DetailRow
              icon={isIncome ? "trending-up-outline" : "trending-down-outline"}
              iconBg={accentColor + "15"}
              iconColor={accentColor}
              label="Type"
              value={isIncome ? "Income" : "Expense"}
              borderBottom
              theme={theme}
            />
            <DetailRow
              icon="pricetag-outline"
              iconBg={theme.accent + "15"}
              iconColor={theme.accent}
              label="Category"
              value={`${item.parent_category} › ${item.sub_category}`}
              borderBottom
              theme={theme}
            />
            {item.latitude ? (
              <DetailRow
                icon="location-outline"
                iconBg="#3B7DD815"
                iconColor="#3B7DD8"
                label="Location"
                value={`${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                borderBottom={!!item.notes}
                theme={theme}
                onPress={openInMaps}
              />
            ) : null}
            {item.notes ? (
              <DetailRow
                icon="document-text-outline"
                iconBg={theme.accent + "15"}
                iconColor={theme.accent}
                label="Note"
                value={item.notes}
                theme={theme}
              />
            ) : null}
          </View>
        </AnimatedRow>

        {/* ── ATTACHMENTS ── */}
        {item.image_urls && item.image_urls.length > 0 && (
          <AnimatedRow delay={180}>
            <SectionHeader label={`ATTACHMENTS · ${item.image_urls.length}`} theme={theme} />
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.attachmentsWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {item.image_urls.map((url, index) => (
                      <TouchableOpacity key={index} onPress={() => setFullImage(url)} activeOpacity={0.85}>
                        <Image source={{ uri: url }} style={styles.thumbnail} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
          </AnimatedRow>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── FIXED BOTTOM ACTION BAR ── */}
      <Animated.View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: barAnim }],
          },
        ]}
      >
        {item.latitude && (
          <TouchableOpacity style={styles.actionBtn} onPress={openInMaps}>
            <View style={[styles.actionIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name="map" size={22} color={theme.accent} />
            </View>
            <Text style={[styles.actionLabel, { color: theme.subText }]}>Map</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionBtn} onPress={handleShareImage}>
          <View style={[styles.actionIcon, { backgroundColor: "#4A90E218" }]}>
            <Ionicons name="share-social" size={22} color="#4A90E2" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: "/edit", params: { item: JSON.stringify(item) } })}
        >
          <View style={[styles.actionIcon, { backgroundColor: "#f39c1218" }]}>
            <Ionicons name="create" size={22} color="#f39c12" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <View style={[styles.actionIcon, { backgroundColor: "#FF6B6B18" }]}>
            <Ionicons name="trash" size={22} color="#FF6B6B" />
          </View>
          <Text style={[styles.actionLabel, { color: theme.subText }]}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── CUSTOM MODAL ── */}
      <Modal visible={customModal.visible} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={[styles.customModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.customModalIcon, { backgroundColor: (customModal.iconColor ?? theme.accent) + "18" }]}>
              <Ionicons name={customModal.icon} size={30} color={customModal.iconColor ?? theme.accent} />
            </View>
            <Text style={[styles.customModalTitle, { color: theme.text }]}>{customModal.title}</Text>
            <Text style={[styles.customModalMessage, { color: theme.subText }]}>{customModal.message}</Text>
            <View style={styles.customModalButtons}>
              {customModal.buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={btn.onPress}
                  style={[styles.customModalBtn, btn.primary ? { backgroundColor: customModal.iconColor ?? theme.accent } : { backgroundColor: theme.surfaceAlt }]}
                >
                  <Text style={[styles.customModalBtnText, { color: btn.primary ? "#fff" : theme.text }]}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FULL IMAGE MODAL ── */}
      <Modal visible={!!fullImage} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setFullImage(null)}>
          <Image source={{ uri: fullImage }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setFullImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* ── HIDDEN RECEIPT FOR SCREENSHOT ── */}
      <View style={{ position: "absolute", left: -9999, top: -9999 }}>
        <ViewShot ref={receiptRef} options={{ format: "png", quality: 1 }}>
          <View style={{ backgroundColor: theme.bg, padding: 32, width: 340, borderRadius: 24 }}>
            <View style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 10, alignItems: "center", marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 2 }}>TRANSACTION RECEIPT</Text>
            </View>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={{ backgroundColor: accentColor + "18", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: accentColor, letterSpacing: 1.5 }}>
                  {isIncome ? "↑ INCOME" : "↓ EXPENSE"}
                </Text>
              </View>
              <Text style={{ fontSize: 44, fontWeight: "900", color: theme.text, letterSpacing: -1 }}>
                {isIncome ? "+" : "-"}{currency}
                {item.amount ? Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: theme.subText, marginTop: 4 }}>
                {item.parent_category}  ›  {item.sub_category}
              </Text>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: theme.border, paddingTop: 20, gap: 14 }}>
              {[
                { label: "Date", value: item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "N/A" },
                { label: "Time", value: item.custom_created_at ? `Custom · ${format(new Date(item.custom_created_at), "MMM d, yyyy")}` : item.created_at ? format(new Date(item.created_at), "h:mm a") : "N/A" },
                ...(item.notes ? [{ label: "Note", value: item.notes }] : []),
                ...(item.latitude ? [{ label: "Location", value: `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` }] : []),
              ].map(({ label, value }) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.subText, fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" }}>{value}</Text>
                </View>
              ))}
            </View>
            {item.image_urls && item.image_urls.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ color: theme.subText, fontSize: 13, marginBottom: 10 }}>Attachments</Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {item.image_urls.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                  ))}
                </View>
              </View>
            )}
            <View style={{ borderTopWidth: 1, borderColor: theme.border, marginTop: 20, paddingTop: 14, alignItems: "center" }}>
              <Text style={{ color: accentColor, fontSize: 11, fontWeight: "800", letterSpacing: 1 }}>MONTRA</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },

  // ── SCROLL
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, gap: 8 },

  // ── SECTION LABEL
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
  },

  // ── HERO CARD
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginBottom: 4,
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
  mainAmount: { fontSize: 44, fontWeight: "900", letterSpacing: -1, marginBottom: 6 },
  categoryText: { fontSize: 13, fontWeight: "500" },
  heroDivider: { width: "100%", height: 1, marginVertical: 16 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  heroMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaDot: { width: 4, height: 4, borderRadius: 2 },
  heroMetaText: { fontSize: 13, fontWeight: "500" },
  editedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  editedText: { color: "#f39c12", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  // ── CARD
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 4 },

  // ── SETTING ROW
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingRight: { flexDirection: "row", alignItems: "center", maxWidth: "45%" },
  settingRowStacked: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  detailValFull: { fontSize: 13, fontWeight: "500", lineHeight: 20, marginLeft: 44 },
  iconCircle: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  settingText: { fontSize: 14, fontWeight: "600" },
  detailVal: { fontSize: 13, fontWeight: "500", textAlign: "right" },

  // ── ATTACHMENTS
  attachmentsWrap: { padding: 14 },
  thumbnail: { width: 110, height: 110, borderRadius: 14 },

  // ── BOTTOM ACTION BAR
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 14,
    paddingHorizontal: 8,
    borderTopWidth: 1,
  },
  actionBtn: { alignItems: "center", gap: 6, flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 11, fontWeight: "600" },

  // ── MODAL
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "100%", height: "80%" },
  closeModalBtn: { position: "absolute", top: 50, right: 20 },

  // ── CUSTOM MODAL
  customModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  customModalCard: { width: "100%", borderRadius: 24, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  customModalIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  customModalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  customModalMessage: { fontSize: 14, fontWeight: "500", textAlign: "center", lineHeight: 20 },
  customModalButtons: { width: "100%", gap: 8, marginTop: 6 },
  customModalBtn: { width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  customModalBtnText: { fontSize: 15, fontWeight: "700" },
});