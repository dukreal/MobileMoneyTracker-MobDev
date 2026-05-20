import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  Modal,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { initDB, updateLocalTransaction, enqueuePendingOp } from "../db/localDB";
import { buildTheme } from "../constants/settings";

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
  return (
    <Text style={[styles.sectionLabel, { color: theme.subText }]}>{label}</Text>
  );
}

export default function EditScreen({ item }) {
  const { isDarkMode, currency, colorTheme, isOnline, refreshPendingCount } = useStore();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(item.amount.toString());
  const [notes, setNotes] = useState(item.notes || "");

  const headerAnim = useRef(new Animated.Value(0)).current;

  const [customModal, setCustomModal] = useState({ visible: false, icon: "alert-circle-outline", iconColor: null, title: "", message: "", buttons: [] });
  const showModal = (icon, iconColor, title, message, buttons) => setCustomModal({ visible: true, icon, iconColor, title, message, buttons });
  const hideModal = () => setCustomModal((prev) => ({ ...prev, visible: false }));

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const isIncome = item.type === "income";
  const accentColor = isIncome ? "#2ECC71" : "#FF6B6B";
  const theme = buildTheme(isDarkMode, colorTheme);

  const handleUpdate = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showModal("alert-circle-outline", theme.danger, "Invalid Amount", "Please enter a valid amount greater than 0.", [{ label: "OK", onPress: hideModal, primary: true }]);
      return;
    }

    setLoading(true);

    const updateData = {
      amount: parsedAmount,
      notes: notes,
      is_edited: true,
      last_edited_at: new Date().toISOString(),
    };

    if (!item.is_edited) {
      updateData.original_amount = item.amount;
      updateData.original_notes = item.notes;
    }

    try {
      await initDB();

      if (isOnline) {
        const { error } = await supabase
          .from("transactions")
          .update(updateData)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        await updateLocalTransaction(item.id, {
          ...updateData,
          original_amount: item.amount,
          original_notes: item.notes,
        });
        await enqueuePendingOp(item.id, "UPDATE", { id: item.id, ...updateData });
        await refreshPendingCount();
      }

      showModal(
        isOnline ? "checkmark-circle-outline" : "cloud-offline-outline",
        isOnline ? "#2ECC71" : "#f39c12",
        isOnline ? "Updated!" : "Saved Offline",
        isOnline ? "Transaction updated successfully." : "Saved locally. Will sync when back online.",
        [{ label: "OK", primary: true, onPress: () => { hideModal(); router.replace("/(tabs)"); } }]
      );
    } catch (err) {
      showModal("close-circle-outline", "#FF6B6B", "Update Failed", err.message, [{ label: "OK", onPress: hideModal, primary: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Entry</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── AMOUNT HERO ── */}
        <AnimatedRow delay={60}>
          <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Type pill */}
            <View style={[styles.typePill, { backgroundColor: accentColor + "18" }]}>
              <Ionicons name={isIncome ? "arrow-up" : "arrow-down"} size={11} color={accentColor} />
              <Text style={[styles.typeText, { color: accentColor }]}>
                {isIncome ? "INCOME" : "EXPENSE"}
              </Text>
            </View>

            {/* Currency label */}
            <Text style={[styles.currencyLabel, { color: theme.subText }]}>{currency}</Text>

            {/* Amount input */}
            <TextInput
              style={[styles.amountInput, { color: theme.text }]}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
              placeholder="0.00"
              placeholderTextColor={theme.subText}
              textAlign="center"
            />

            {/* Divider */}
            <View style={[styles.heroDivider, { backgroundColor: theme.border }]} />

            {/* Category hint */}
            <View style={styles.categoryRow}>
              <View style={[styles.categoryIconBox, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="pricetag-outline" size={13} color={theme.subText} />
              </View>
              <Text style={[styles.categoryHint, { color: theme.subText }]}>
                {item.parent_category}  ›  {item.sub_category}
              </Text>
            </View>
          </View>
        </AnimatedRow>

        {/* ── NOTES ── */}
        <AnimatedRow delay={120}>
          <SectionHeader label="NOTE" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.noteRow}>
              <View style={[styles.iconCircle, { backgroundColor: theme.accent + "15" }]}>
                <Ionicons name="document-text-outline" size={17} color={theme.accent} />
              </View>
              <TextInput
                style={[styles.notesInput, { color: theme.text }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Add a note..."
                placeholderTextColor={theme.subText}
                textAlignVertical="top"
              />
            </View>
          </View>
        </AnimatedRow>

        {/* ── DETAILS (non-editable) ── */}
        <AnimatedRow delay={180}>
          <SectionHeader label="DETAILS" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>

            {/* Type */}
            <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: accentColor + "15" }]}>
                  <Ionicons
                    name={isIncome ? "trending-up-outline" : "trending-down-outline"}
                    size={17}
                    color={accentColor}
                  />
                </View>
                <Text style={[styles.settingText, { color: theme.text }]}>Type</Text>
              </View>
              <View style={[styles.valuePill, { backgroundColor: accentColor + "18" }]}>
                <Text style={[styles.valuePillText, { color: accentColor }]}>
                  {isIncome ? "Income" : "Expense"}
                </Text>
              </View>
            </View>

            {/* Category */}
            <View
              style={[
                styles.settingRow,
                item.latitude ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
              ]}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconCircle, { backgroundColor: theme.accent + "15" }]}>
                  <Ionicons name="pricetag-outline" size={17} color={theme.accent} />
                </View>
                <Text style={[styles.settingText, { color: theme.text }]}>Category</Text>
              </View>
              <Text style={[styles.detailVal, { color: theme.subText }]}>
                {item.parent_category} › {item.sub_category}
              </Text>
            </View>

            {/* Location (conditional) */}
            {item.latitude ? (
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: "#3B7DD815" }]}>
                    <Ionicons name="location-outline" size={17} color="#3B7DD8" />
                  </View>
                  <Text style={[styles.settingText, { color: theme.text }]}>Location</Text>
                </View>
                <Text style={[styles.detailVal, { color: theme.subText }]}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            ) : null}
          </View>
        </AnimatedRow>
      </ScrollView>

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

      {/* ── SAVE BUTTON ── */}
      <AnimatedRow delay={240} style={styles.bottomWrap}>
        <PressableRow onPress={handleUpdate}>
          <View style={[styles.saveButton, { backgroundColor: theme.accent }]}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.saveText}>Save Changes</Text>
              </>
            )}
          </View>
        </PressableRow>
      </AnimatedRow>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── HEADER
  header: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 8 },

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
    marginBottom: 14,
  },
  typeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  currencyLabel: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  amountInput: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
    minWidth: 120,
    textAlign: "center",
    paddingVertical: 4,
  },
  heroDivider: { width: "100%", height: 1, marginVertical: 16 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryIconBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryHint: { fontSize: 13, fontWeight: "500" },

  // ── CARD
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 4 },

  // ── NOTE ROW
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  notesInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 72,
    lineHeight: 22,
  },

  // ── SETTING ROW
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  settingText: { fontSize: 14, fontWeight: "600" },
  detailVal: { fontSize: 13, fontWeight: "500", maxWidth: "50%", textAlign: "right" },

  // ── VALUE PILL
  valuePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  valuePillText: { fontSize: 12, fontWeight: "700" },

  // ── BOTTOM
  bottomWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveText: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },

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