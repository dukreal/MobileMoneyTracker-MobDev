import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { isSameDay, startOfDay, format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

function TransactionItem({ item, theme, currency, navigation, index }) {
  const isExpense = item.type === "expense";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay: index * 35,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        delay: index * 35,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate("Details", { item })}
        activeOpacity={0.7}
      >
        {/* LEFT: Icon */}
        <View style={[styles.txIconWrap, { backgroundColor: isExpense ? "#FF6B6B15" : "#2ECC7115" }]}>
          <Ionicons
            name={isExpense ? "arrow-down" : "arrow-up"}
            size={17}
            color={isExpense ? "#FF6B6B" : "#2ECC71"}
          />
        </View>

        {/* MIDDLE: Info */}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.txTitle, { color: theme.text }]} numberOfLines={1}>
            {item.sub_category}
          </Text>
          <Text style={[styles.txMeta, { color: theme.subText }]} numberOfLines={1}>
            {item.parent_category}
            {item.notes ? ` • ${item.notes}` : ""}
          </Text>
        </View>

        {/* RIGHT: Amount + Time */}
        <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
          <Text style={[styles.txAmount, { color: isExpense ? "#FF6B6B" : "#2ECC71" }]}>
            {isExpense ? "-" : "+"}{currency}{item.amount.toFixed(2)}
          </Text>
          <Text style={[styles.txTime, { color: theme.subText }]}>
            {item.created_at ? format(new Date(item.created_at), "MMM d, h:mm a") : ""}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SearchScreen({ navigation }) {
  const { currency, isDarkMode, user } = useStore();
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTypes, setSearchTypes] = useState(["all"]);
  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const inputRef = useRef(null);

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    card: isDarkMode ? "#1e1e1e" : "#f5f5f5",
    text: isDarkMode ? "#ffffff" : "#000000",
    border: isDarkMode ? "#2a2a2a" : "#eeeeee",
    subText: isDarkMode ? "#666666" : "#aaaaaa",
    inputBg: isDarkMode ? "#1e1e1e" : "#f5f5f5",
  };

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTransactions(data);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      setSearchQuery("");
      setSearchTypes(["all"]);
      setSearchStartDate(null);
      setSearchEndDate(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, [fetchTransactions]),
  );

  const searchResults = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase();
      const txDate = startOfDay(new Date(t.created_at));
      const matchesSearch =
        !q ||
        (searchTypes.includes("all") &&
          (t.sub_category?.toLowerCase().includes(q) ||
            t.parent_category?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q) ||
            String(t.amount).includes(q))) ||
        (searchTypes.includes("sub_category") && t.sub_category?.toLowerCase().includes(q)) ||
        (searchTypes.includes("notes") && t.notes?.toLowerCase().includes(q)) ||
        (searchTypes.includes("amount") && String(t.amount).includes(q));
      const matchesStart = !searchStartDate || txDate >= startOfDay(searchStartDate);
      const matchesEnd = !searchEndDate || txDate <= startOfDay(searchEndDate);
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [transactions, searchQuery, searchTypes, searchStartDate, searchEndDate]);

  const handleChipPress = (id) => {
    if (id === "all") {
      setSearchTypes(["all"]);
    } else {
      setSearchTypes((prev) => {
        const filtered = prev.filter((t) => t !== "all");
        if (filtered.includes(id)) {
          const next = filtered.filter((t) => t !== id);
          return next.length === 0 ? ["all"] : next;
        }
        const next = [...filtered, id];
        const allFields = ["sub_category", "notes", "amount"];
        return allFields.every((f) => next.includes(f)) ? ["all"] : next;
      });
    }
  };

  const CHIPS = [
    { id: "all", label: "All", icon: "flash-outline" },
    { id: "sub_category", label: "Category", icon: "pricetag-outline" },
    { id: "notes", label: "Notes", icon: "document-text-outline" },
    { id: "amount", label: "Amount", icon: "cash-outline" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.searchBarContainer, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="search" size={16} color={theme.subText} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={theme.subText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* CHIPS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CHIPS.map((chip) => {
          const isActive = searchTypes.includes(chip.id);
          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => handleChipPress(chip.id)}
              style={[
                styles.chip,
                { backgroundColor: isActive ? (isDarkMode ? "#fff" : "#000") : theme.inputBg },
              ]}
            >
              <Ionicons
                name={chip.icon}
                size={12}
                color={isActive ? (isDarkMode ? "#000" : "#fff") : theme.subText}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.chipText, { color: isActive ? (isDarkMode ? "#000" : "#fff") : theme.subText }]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* DATE CHIP */}
        <TouchableOpacity
          onPress={() =>
            searchStartDate || searchEndDate
              ? (setSearchStartDate(null), setSearchEndDate(null))
              : setSearchStartDate(new Date())
          }
          style={[
            styles.chip,
            { backgroundColor: searchStartDate || searchEndDate ? "#0081db" : theme.inputBg },
          ]}
        >
          <Ionicons
            name={searchStartDate || searchEndDate ? "close" : "calendar-outline"}
            size={12}
            color={searchStartDate || searchEndDate ? "#fff" : theme.subText}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.chipText, { color: searchStartDate || searchEndDate ? "#fff" : theme.subText }]}>
            {searchStartDate || searchEndDate ? "Clear" : "Date"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* RESULTS COUNT */}
      {searchQuery.length > 0 && (
        <Text style={[styles.resultsLabel, { color: theme.subText }]}>
          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
        </Text>
      )}

      {/* LIST */}
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          searchResults.length === 0 && { flexGrow: 1 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TransactionItem
            item={item}
            index={index}
            theme={theme}
            currency={currency}
            navigation={navigation}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: theme.card }]}>
              <Ionicons name="search-outline" size={32} color={theme.subText} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery ? "No results" : "Search anything"}
            </Text>
            <Text style={[styles.emptySub, { color: theme.subText }]}>
              {searchQuery
                ? `Nothing matched "${searchQuery}"`
                : "Find by name, category, amount or notes"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 55,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  resultsLabel: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 18,
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 40,
  },

  txCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  txTitle: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  txMeta: { fontSize: 12 },
  txAmount: { fontWeight: "800", fontSize: 14, marginBottom: 2 },
  txTime: { fontSize: 11 },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
    gap: 10,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptySub: { fontSize: 13, textAlign: "center", paddingHorizontal: 40, lineHeight: 19 },
});