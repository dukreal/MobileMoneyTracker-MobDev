import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import {
  isSameDay, startOfDay, format,
  startOfMonth, endOfMonth, eachDayOfInterval,
  addYears, subYears, isSameMonth,
  setMonth, getYear, getMonth,
  startOfWeek, endOfWeek, isAfter,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import CalendarModal from "../components/CalendarModal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── TRANSACTION ITEM ─────────────────────────────────────────────────────────
function TransactionItem({ item, theme, currency, navigation, index }) {
  const isExpense = item.type === "expense";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, delay: index * 30, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, delay: index * 30, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[s.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => navigation.navigate("Details", { item })}
        activeOpacity={0.7}
      >
        <View style={[s.txIcon, { backgroundColor: isExpense ? "#FF6B6B15" : "#2ECC7115" }]}>
          <Ionicons name={isExpense ? "arrow-down" : "arrow-up"} size={16} color={isExpense ? "#FF6B6B" : "#2ECC71"} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.txTitle, { color: theme.text }]} numberOfLines={1}>{item.sub_category}</Text>
          <Text style={[s.txMeta, { color: theme.subText }]} numberOfLines={1}>
            {item.parent_category}{item.notes ? ` • ${item.notes}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.txAmount, { color: isExpense ? "#FF6B6B" : "#2ECC71" }]}>
            {isExpense ? "-" : "+"}{currency}{item.amount.toFixed(2)}
          </Text>
          <Text style={[s.txTime, { color: theme.subText }]}>
            {item.created_at ? format(new Date(item.created_at), "MMM d, h:mm a") : ""}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── SEARCH SCREEN ────────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }) {
  const { currency, isDarkMode, user } = useStore();
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTypes, setSearchTypes] = useState(["all"]);
  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const [startCalVisible, setStartCalVisible] = useState(false);
  const [endCalVisible, setEndCalVisible] = useState(false);
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
      .from("transactions").select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTransactions(data);
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    fetchTransactions();
    setSearchQuery("");
    setSearchTypes(["all"]);
    setSearchStartDate(null);
    setSearchEndDate(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [fetchTransactions]));

  const searchResults = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase();
      const txDate = startOfDay(new Date(t.created_at));
      const matchesSearch = !q ||
        (searchTypes.includes("all") && (
          t.sub_category?.toLowerCase().includes(q) ||
          t.parent_category?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        )) ||
        (searchTypes.includes("sub_category") && (t.sub_category?.toLowerCase().includes(q) || t.parent_category?.toLowerCase().includes(q))) ||
        (searchTypes.includes("notes") && t.notes?.toLowerCase().includes(q)) ||
        (searchTypes.includes("amount") && String(t.amount).includes(q));
      const matchesStart = !searchStartDate || txDate >= startOfDay(searchStartDate);
      const matchesEnd = !searchEndDate || txDate <= startOfDay(searchEndDate);
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [transactions, searchQuery, searchTypes, searchStartDate, searchEndDate]);

  const handleChipPress = (id) => {
    if (id === "all") { setSearchTypes(["all"]); return; }
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
  };

  const handleDateChipPress = () => {
    if (searchStartDate || searchEndDate) {
      setSearchStartDate(null);
      setSearchEndDate(null);
    } else {
      setStartCalVisible(true);
    }
  };

  const dateLabel = searchStartDate && searchEndDate
    ? `${format(searchStartDate, "MMM d")} – ${format(searchEndDate, "MMM d")}`
    : searchStartDate
    ? format(searchStartDate, "MMM d")
    : "Date";

  const CHIPS = [
    { id: "all", label: "All", icon: "flash-outline" },
    { id: "sub_category", label: "Category", icon: "pricetag-outline" },
    { id: "notes", label: "Notes", icon: "document-text-outline" },
    { id: "amount", label: "Amount", icon: "cash-outline" },
  ];

  const hasDate = searchStartDate || searchEndDate;

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={[s.searchBar, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="search" size={16} color={theme.subText} />
          <TextInput
            ref={inputRef}
            style={[s.searchInput, { color: theme.text }]}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
        {CHIPS.map((chip) => {
          const isActive = searchTypes.includes(chip.id);
          return (
            <TouchableOpacity
              key={chip.id}
              onPress={() => handleChipPress(chip.id)}
              style={[s.chip, { backgroundColor: isActive ? (isDarkMode ? "#fff" : "#000") : theme.inputBg }]}
            >
              <Ionicons name={chip.icon} size={13} color={isActive ? (isDarkMode ? "#000" : "#fff") : theme.subText} style={{ marginRight: 5 }} />
              <Text style={[s.chipText, { color: isActive ? (isDarkMode ? "#000" : "#fff") : theme.subText }]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={handleDateChipPress}
          style={[s.chip, { backgroundColor: hasDate ? "#0081db" : theme.inputBg }]}
        >
          <Ionicons name={hasDate ? "close" : "calendar-outline"} size={13} color={hasDate ? "#fff" : theme.subText} style={{ marginRight: 5 }} />
          <Text style={[s.chipText, { color: hasDate ? "#fff" : theme.subText }]}>{dateLabel}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* LIST */}
      <FlatList
        data={searchQuery.length === 0 && !searchStartDate && !searchEndDate ? [] : 
              searchStartDate && !searchEndDate ? [] : searchResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.listContent, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TransactionItem item={item} index={index} theme={theme} currency={currency} navigation={navigation} />
        )}
        ListHeaderComponent={
          <Text style={[s.resultsLabel, { color: theme.subText, opacity: (searchQuery.length > 0 || (searchStartDate && searchEndDate)) && searchResults.length > 0 ? 1 : 0 }]}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={[s.emptyIconBox, { backgroundColor: theme.card }]}>
              <Ionicons name="search-outline" size={32} color={theme.subText} />
            </View>
            <Text style={[s.emptyTitle, { color: theme.text }]}>
              {searchQuery ? "No results" : "Try searching"}
            </Text>
            <Text style={[s.emptySub, { color: theme.subText }]}>
              {searchQuery ? `Nothing matched "${searchQuery}"` : "Find by name, category,\namount or notes"}
            </Text>
          </View>
        }
      />

      {/* CALENDARS */}
      <CalendarModal
        visible={startCalVisible}
        onClose={() => setStartCalVisible(false)}
        currentDate={searchStartDate || new Date()}
        onSelectDate={(date) => { setSearchStartDate(date); setTimeout(() => setEndCalVisible(true), 300); }}
        isDarkMode={isDarkMode}
        title="Start Date"
      />
      <CalendarModal
        visible={endCalVisible}
        onClose={() => setEndCalVisible(false)}
        currentDate={searchEndDate || searchStartDate || new Date()}
        onSelectDate={(date) => { setSearchEndDate(date); }}
        isDarkMode={isDarkMode}
        title="End Date"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 6,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsContent: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    overflow: "visible",
  },
  chipText: { fontSize: 13, fontWeight: "700" },

  resultsLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  listContent: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 40 },

  txCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  txIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  txTitle: { fontWeight: "700", fontSize: 14, marginBottom: 2 },
  txMeta: { fontSize: 12 },
  txAmount: { fontWeight: "800", fontSize: 14, marginBottom: 2 },
  txTime: { fontSize: 11 },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyIconBox: { width: 68, height: 68, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20, color: "#888" },
});

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, borderWidth: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#333", alignSelf: "center", marginBottom: 16 },
  navRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  navTitle: { fontSize: 22, fontWeight: "800", marginHorizontal: 30 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  monthCol: { width: "25%", height: 40, justifyContent: "center", alignItems: "center" },
  monthPill: { width: "90%", height: "85%", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  divider: { height: 1, backgroundColor: "#222", marginVertical: 15 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCol: { width: "14.28%", height: 48, justifyContent: "center", alignItems: "center" },
  dayCell: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  dayNum: { fontSize: 16, fontWeight: "700" },
  doneBtn: { alignItems: "center", marginTop: 10 },
});