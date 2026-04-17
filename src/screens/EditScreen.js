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

export default function EditScreen({ route, navigation }) {
  const { item } = route.params; // Data from DetailsScreen
  const { isDarkMode } = useStore();
  const [loading, setLoading] = useState(false);

  // Load the current data into the inputs
  const [amount, setAmount] = useState(item.amount.toString());
  const [notes, setNotes] = useState(item.notes || "");

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    text: isDarkMode ? "#ffffff" : "#000000",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    inputBorder: isDarkMode ? "#333" : "#eee",
  };

  const handleUpdate = async () => {
    if (!amount) return Alert.alert("Error", "Amount is required");

    setLoading(true);

    // Prepare the update object
    const updateData = {
      amount: parseFloat(amount),
      notes: notes,
      is_edited: true,
      last_edited_at: new Date().toISOString(),
    };

    // --- AUDIT TRAIL LOGIC ---
    // Only save "original" values if this is the FIRST time the record is edited
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
          // CHANGE THIS LINE BELOW:
          onPress: () => navigation.navigate("MainTabs", { screen: "Home" }),
        },
      ]);
    } catch (err) {
      Alert.alert("Update Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Edit Entry
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
      <TextInput
        style={[
          styles.amountInput,
          { color: theme.text, backgroundColor: theme.card },
        ]}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />

      <Text style={[styles.label, { color: theme.text }]}>Notes</Text>
      <TextInput
        style={[
          styles.notesInput,
          { color: theme.text, backgroundColor: theme.card },
        ]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Add details..."
        placeholderTextColor="#666"
      />

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: isDarkMode ? "#fff" : "#000" },
        ]}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={isDarkMode ? "#000" : "#fff"} />
        ) : (
          <Text
            style={[styles.saveText, { color: isDarkMode ? "#000" : "#fff" }]}
          >
            Save Changes
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: "900",
    padding: 20,
    borderRadius: 15,
  },
  notesInput: {
    fontSize: 16,
    padding: 20,
    borderRadius: 15,
    height: 120,
    textAlignVertical: "top",
    marginTop: 5,
  },
  saveButton: {
    padding: 20,
    borderRadius: 15,
    marginTop: 40,
    alignItems: "center",
    elevation: 4,
  },
  saveText: { fontSize: 18, fontWeight: "bold" },
});
