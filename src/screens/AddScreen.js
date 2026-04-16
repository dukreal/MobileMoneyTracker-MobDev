import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { CATEGORIES } from "../constants/Categories";
import { Ionicons } from "@expo/vector-icons";

export default function AddScreen({ navigation }) {
  // 1. Pull Dark Mode and User info from Zustand
  const { isDarkMode, user } = useStore();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  // Reset category selection when switching between Income/Expense
  const handleTypeChange = (newType) => {
    setType(newType);
    setSelectedCat(null);
    setSelectedSub(null);
  };

  const handleSave = async () => {
    if (!amount || !selectedCat || !selectedSub) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const { error } = await supabase.from("transactions").insert([
      {
        user_id: user?.id,
        amount: parseFloat(amount),
        type: type,
        parent_category: selectedCat.name,
        sub_category: selectedSub,
        notes: notes,
      },
    ]);

    if (error) {
      Alert.alert("Error saving", error.message);
    } else {
      Alert.alert("Success", "Transaction saved!");
      setAmount("");
      setNotes("");
      setSelectedCat(null);
      setSelectedSub(null);
      navigation.navigate("Home");
    }
  };

  // 2. Define colors based on the theme
  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    card: isDarkMode ? "#1E1E1E" : "#f9f9f9",
    inputBorder: isDarkMode ? "#333" : "#eee",
    placeholder: isDarkMode ? "#777" : "#999",
    unselectedToggle: isDarkMode ? "#333" : "#f0f0f0",
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 1. Type Toggle */}
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.toggle,
            { backgroundColor: theme.unselectedToggle },
            type === "expense" && styles.activeExpense,
          ]}
          onPress={() => handleTypeChange("expense")}
        >
          <Text
            style={
              type === "expense" ? styles.whiteText : { color: theme.text }
            }
          >
            Expense
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggle,
            { backgroundColor: theme.unselectedToggle },
            type === "income" && styles.activeIncome,
          ]}
          onPress={() => handleTypeChange("income")}
        >
          <Text
            style={type === "income" ? styles.whiteText : { color: theme.text }}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Amount Input */}
      <TextInput
        style={[styles.amountInput, { color: theme.text }]}
        placeholder="0.00"
        placeholderTextColor={theme.placeholder}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      {/* 3. Category Selection */}
      <Text style={[styles.label, { color: theme.text }]}>Select Category</Text>
      <View style={styles.catGrid}>
        {CATEGORIES[type].map((cat) => (
          <TouchableOpacity
            key={cat.name}
            onPress={() => {
              setSelectedCat(cat);
              setSelectedSub(null);
            }}
            style={[
              styles.catItem,
              { backgroundColor: theme.card },
              selectedCat?.name === cat.name && {
                borderColor: cat.color,
                borderWidth: 2,
              },
            ]}
          >
            <Ionicons name={cat.icon} size={24} color={cat.color} />
            <Text style={[styles.catText, { color: theme.text }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. Sub-category Selection */}
      {selectedCat && (
        <View style={styles.subContainer}>
          <Text style={[styles.label, { color: theme.text }]}>
            Select {selectedCat.name} Type
          </Text>
          <View style={styles.subGrid}>
            {selectedCat.subs.map((sub) => (
              <TouchableOpacity
                key={sub}
                onPress={() => setSelectedSub(sub)}
                style={[
                  styles.subItem,
                  { backgroundColor: isDarkMode ? "#333" : "#eee" },
                  selectedSub === sub && styles.activeSub,
                ]}
              >
                <Text
                  style={
                    selectedSub === sub
                      ? styles.whiteText
                      : { color: theme.text }
                  }
                >
                  {sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 5. Notes */}
      <TextInput
        style={[
          styles.notesInput,
          { color: theme.text, borderColor: theme.inputBorder },
        ]}
        placeholder="Add a note..."
        placeholderTextColor={theme.placeholder}
        value={notes}
        onChangeText={setNotes}
      />

      {/* 6. Save Button */}
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: isDarkMode ? "#fff" : "#000" },
        ]}
        onPress={handleSave}
      >
        <Text
          style={[styles.saveText, { color: isDarkMode ? "#000" : "#fff" }]}
        >
          Save Transaction
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  toggle: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeExpense: { backgroundColor: "#FF6B6B" },
  activeIncome: { backgroundColor: "#2ECC71" },
  whiteText: { color: "#fff", fontWeight: "bold" },
  amountInput: {
    fontSize: 50,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "bold",
  },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 10, marginTop: 10 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  catItem: {
    width: "30%",
    padding: 10,
    alignItems: "center",
    borderRadius: 10,
    marginBottom: 10,
  },
  catText: { fontSize: 10, marginTop: 5, textAlign: "center" },
  subGrid: { flexDirection: "row", flexWrap: "wrap" },
  subItem: { padding: 10, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  activeSub: { backgroundColor: "#4A90E2" },
  notesInput: {
    borderBottomWidth: 1,
    padding: 15,
    marginTop: 20,
    fontSize: 16,
  },
  saveButton: {
    padding: 20,
    borderRadius: 15,
    marginTop: 30,
    alignItems: "center",
    marginBottom: 50,
  },
  saveText: { fontSize: 18, fontWeight: "bold" },
});
