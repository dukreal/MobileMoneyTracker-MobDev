import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function EditScreen({ item }) {
  const { isDarkMode, currency } = useStore();
  const [loading, setLoading] = useState(false);

  const [amount, setAmount] = useState(item.amount.toString());
  const [notes, setNotes] = useState(item.notes || "");

  const isIncome = item.type === "income";
  const accentColor = isIncome ? "#2ECC71" : "#FF6B6B";

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#888888" : "#999999",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    inputBorder: isDarkMode ? "#2c2c2c" : "#f0f0f0",
    placeholder: isDarkMode ? "#555" : "#bbb",
  };

  const handleUpdate = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      return Alert.alert("Error", "Please enter a valid amount");

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
      const { error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      Alert.alert("Success", "Transaction updated!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)"),
        },
      ]);
    } catch (err) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.bg }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.circleIconBtn,
            { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Entry</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}
      >
        {/* AMOUNT HERO */}
        <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
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

          <Text style={[styles.currencyLabel, { color: theme.subText }]}>
            {currency}
          </Text>
          <TextInput
            style={[styles.amountInput, { color: theme.text }]}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            autoFocus
            placeholder="0.00"
            placeholderTextColor={theme.placeholder}
            textAlign="center"
          />

          <Text style={[styles.categoryHint, { color: theme.subText }]}>
            {item.parent_category}  ›  {item.sub_category}
          </Text>
        </View>

        {/* NOTES */}
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>NOTE</Text>
        <View style={[styles.notesCard, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
          <TextInput
            style={[styles.notesInput, { color: theme.text }]}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Add a note..."
            placeholderTextColor={theme.placeholder}
            textAlignVertical="top"
          />
        </View>

        {/* INFO ROW — non-editable fields */}
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>DETAILS</Text>
        <View style={[styles.detailsCard, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: theme.subText }]}>Type</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>
              {isIncome ? "Income" : "Expense"}
            </Text>
          </View>
          <View style={[styles.detailDivider, { backgroundColor: theme.inputBorder }]} />
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: theme.subText }]}>Category</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>
              {item.parent_category} › {item.sub_category}
            </Text>
          </View>
          {item.latitude ? (
            <>
              <View style={[styles.detailDivider, { backgroundColor: theme.inputBorder }]} />
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: theme.subText }]}>Location</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* SAVE BUTTON */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: isDarkMode ? "#ffffff" : "#000000" },
        ]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={isDarkMode ? "#000" : "#fff"} />
        ) : (
          <Text style={[styles.saveText, { color: isDarkMode ? "#000000" : "#ffffff" }]}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  // HEADER
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 55,
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

  // HERO
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  typeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  currencyLabel: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  amountInput: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1,
    minWidth: 120,
    textAlign: "center",
  },
  categoryHint: { fontSize: 13, fontWeight: "500", marginTop: 10 },

  // SECTION LABEL
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  // NOTES
  notesCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  notesInput: {
    fontSize: 15,
    minHeight: 90,
    lineHeight: 22,
  },

  // DETAILS
  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailKey: { fontSize: 14, fontWeight: "500" },
  detailVal: { fontSize: 14, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  detailDivider: { height: 1, marginHorizontal: 16 },

  // BOTTOM
  saveButton: {
    padding: 18,
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 55,
    alignItems: "center",
  },
  saveText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
});