import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfDay,
  subDays,
  isBefore,
} from "date-fns";

import { Ionicons } from "@expo/vector-icons";
import PickerModal from "../components/PickerModal";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// --- 2. TRANSACTION ITEM ---
function TransactionItem({
  item,
  index,
  theme,
  currency,
  isGuest,
  navigation,
  isSearchOpen,
}) {
  const isExpense = item.type === "expense";
  const sevenDaysAgo = subDays(new Date(), 7);
  if (isGuest && isBefore(new Date(item.created_at), sevenDaysAgo) && !isSearchOpen) {
    return (
      <View
        style={[
          styles.txCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            borderStyle: "dashed",
          },
        ]}
      >
        <Ionicons name="lock-closed" size={18} color={theme.subText} />
        <Text
          style={{ marginLeft: 10, color: theme.subText, fontWeight: "bold" }}
        >
          Login for full history
        </Text>
      </View>
    );
  }
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.txCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => navigation.navigate("Details", { item })}
    >
      <View
        style={[
          styles.circleIconBtn,
          {
            backgroundColor: isExpense ? "#FF6B6B22" : "#2ECC7122",
            marginLeft: 0,
            width: 36,
            height: 36,
          },
        ]}
      >
        <Ionicons
          name={isExpense ? "arrow-down" : "arrow-up"}
          size={18}
          color={isExpense ? "#FF6B6B" : "#2ECC71"}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.txTitle, { color: theme.text }]}>
          {item.sub_category || "Uncategorized"}
        </Text>
        <Text
          style={[styles.txNote, { color: theme.subText }]}
          numberOfLines={1}
        >
          {item.created_at ? format(new Date(item.created_at), "h:mm a") : ""}
          {item.notes ? ` • ${item.notes}` : ""}
        </Text>
      </View>
      <Text
        style={[styles.txAmount, { color: isExpense ? "#FF6B6B" : "#2ECC71" }]}
      >
        {isExpense ? "-" : "+"}
        {currency}
        {Number(item.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}
      </Text>
    </TouchableOpacity>
  );
}

// --- 3. MAIN HOME SCREEN ---
export default function HomeScreen({ navigation, route }) {
  const { currency, isGuest, isDarkMode, user } = useStore();

  // States
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);

  const scrollRef = useRef(null);
  const selectionSource = useRef("system");
  const ITEM_WIDTH = 63;
  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    text: isDarkMode ? "#ffffff" : "#000000",
    border: isDarkMode ? "#2c2c2c" : "#f0f0f0",
    subText: isDarkMode ? "#888888" : "#8e8e93",
    chipUnselected: isDarkMode ? "#1a1a1a" : "#f5f5f5",
  };

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTransactions(data);
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      // If navigated from AddScreen with a date, jump to it
      if (route?.params?.selectedDate) {
        const incoming = startOfDay(new Date(route.params.selectedDate));
        selectionSource.current = "modal";
        setSelectedDate(incoming);
      }
    }, [fetchTransactions, route?.params?.selectedDate]),
  );

  // Auto-scroll
  const daysInMonth = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(selectedDate),
        end: endOfMonth(selectedDate),
      }),
    [selectedDate],
  );
  useEffect(() => {
    if (selectionSource.current !== "strip" && scrollRef.current) {
      const index = daysInMonth.findIndex((day) =>
        isSameDay(day, selectedDate),
      );
      if (index !== -1)
        scrollRef.current.scrollTo({
          x: index * ITEM_WIDTH - SCREEN_WIDTH / 2 + ITEM_WIDTH / 2,
          animated: false,
        });
    }
    selectionSource.current = "system";
  }, [selectedDate, daysInMonth]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) =>
        isSameDay(new Date(t.created_at), selectedDate),
      ),
    [transactions, selectedDate],
  );
  const income = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        {/* Row 1 — App Name */}
        <View style={styles.appNameRow}>
          <Text style={[styles.appNameText, { color: theme.text }]}>
            Montra
          </Text>
        </View>

        {/* Row 2 — Year+Month | Icons */}
        <View style={styles.headerMainRow}>
          <View style={{ position: "absolute", left: 0, right: 0, alignItems: "center" }}>
            <TouchableOpacity
              style={styles.monthDisplayRow}
              onPress={() => setCalendarVisible(true)}
            >
              <Text style={[styles.monthLargeText, { color: "#4A90E2" }]}>
                {format(selectedDate, "MMMM yyyy")}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          {/* Left — Search */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Search")}
          style={[
            styles.circleIconBtn,
            { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
          ]}
        >
          <Ionicons name="search" size={20} color={theme.text} />
        </TouchableOpacity>

        {/* Center — Month pill (already absolute, no change needed) */}

        {/* Right — Share + Settings */}
        <View style={styles.headerIcons}>
          <TouchableOpacity
            onPress={() => {}}
            style={[
              styles.circleIconBtn,
              { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
            ]}
          >
            <Ionicons name="share-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {}}
            style={[
              styles.circleIconBtn,
              { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
            ]}
          >
            <Ionicons name="settings-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
        </View>
      </View>

      {/* MAIN VIEW: DATE STRIP */}
      <View style={[styles.dateStrip, { borderColor: theme.border }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {daysInMonth.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSelected && {
                    backgroundColor: isDarkMode ? "#fff" : "#000",
                  },
                ]}
                onPress={() => {
                  selectionSource.current = "strip";
                  setSelectedDate(day);
                }}
              >
                <Text
                  style={[
                    styles.dateDay,
                    {
                      color: isSelected
                        ? isDarkMode
                          ? "#000"
                          : "#fff"
                        : theme.subText,
                    },
                  ]}
                >
                  {format(day, "EEE")}
                </Text>
                <Text
                  style={[
                    styles.dateNum,
                    {
                      color: isSelected
                        ? isDarkMode
                          ? "#000"
                          : "#fff"
                        : theme.text,
                    },
                  ]}
                >
                  {format(day, "d")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* SUMMARY */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
       <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryVal, { color: "#2ECC71" }]}>
            +{currency}
            {income.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryVal, { color: "#FF6B6B" }]}>
            -{currency}
            {expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryVal, { color: theme.text }]}>
            {income - expense >= 0 ? "" : "-"}{currency}
            {Math.abs(income - expense).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? "#fff" : "#000"} // For iOS
            colors={["#4A90E2"]} // For Android
          />
        }
        contentContainerStyle={
          filteredTransactions.length === 0
            ? { flexGrow: 1 }
            : { paddingBottom: 15 }
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={isDarkMode ? "#222" : "#e0e0e0"}
            />
            <Text style={[styles.emptyText, { color: theme.subText }]}>
              No records for this day
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <TransactionItem
            item={item}
            index={index}
            theme={theme}
            currency={currency}
            isGuest={isGuest}
            navigation={navigation}
            isSearchOpen={false}
          />
        )}
      />

      <PickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        mode="date"
        currentValue={selectedDate}
        onSelect={(date) => {
          selectionSource.current = "modal";
          setSelectedDate(startOfDay(date));
        }}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 0 }, // ← change this
  appNameRow: { alignItems: "center", marginBottom: 4 },
  appNameText: { fontSize: 26, fontWeight: "900", letterSpacing: 0.5 },
  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  yearSubLabel: { fontSize: 13, color: "#777", fontWeight: "700" },
  monthLargeText: { fontSize: 15, fontWeight: "700" },
  monthDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E220",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  dateStrip: { paddingVertical: 10, borderBottomWidth: 1 },
  dateItem: {
    width: 55,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  dateDay: { fontSize: 10, textTransform: "uppercase", fontWeight: "600" },
  dateNum: { fontSize: 16, fontWeight: "bold" },
  summaryCard: {
    flexDirection: "row",
    margin: 15,
    padding: 20,
    borderRadius: 20,
  },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: "#999", marginBottom: 5 },
  summaryVal: { fontSize: 15, fontWeight: "bold" },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 15,
    borderWidth: 1,
  },
  txTitle: { fontWeight: "bold", fontSize: 14 },
  txNote: { fontSize: 12 },
  txAmount: { fontWeight: "bold", fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 150,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 10,
  },
  searchActiveContainer: { paddingTop: 55, paddingHorizontal: 20, flex: 1 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 16, paddingHorizontal: 10 },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  searchTypeChipText: { fontSize: 12, fontWeight: "700" },
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  datePickerBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
  },
  doneBtn: { alignItems: "center", marginTop: 10 },
});