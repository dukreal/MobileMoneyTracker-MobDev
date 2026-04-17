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
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
  Alert,
  BackHandler,
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
  addYears,
  subYears,
  isSameMonth,
  setMonth,
  getYear,
  getMonth,
  startOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";

import { Ionicons } from "@expo/vector-icons";

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

// --- CALENDAR MODAL COMPONENT ---
function CalendarModal({
  visible,
  onClose,
  currentDate,
  onSelectDate,
  isDarkMode,
}) {
  const [viewDate, setViewDate] = useState(currentDate);

  useEffect(() => {
    if (visible) setViewDate(currentDate);
  }, [visible, currentDate]);

  const year = getYear(viewDate);
  const month = getMonth(viewDate);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const textColor = isDarkMode ? "#fff" : "#000";
  const subColor = "#666";
  const activeBlue = "#0081db";
  const today = new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.fullCloseOverlay} onPress={onClose} />
        <Pressable
          style={[
            styles.calendarSheet,
            {
              backgroundColor: isDarkMode ? "#121212" : "#fff",
              borderColor: isDarkMode ? "#333" : "#eee",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <View style={styles.calNavRow}>
            <TouchableOpacity
              onPress={() => setViewDate(subYears(viewDate, 1))}
            >
              <Ionicons name="chevron-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.calNavTitle, { color: textColor }]}>
              {year}
            </Text>
            <TouchableOpacity
              onPress={() => setViewDate(addYears(viewDate, 1))}
            >
              <Ionicons name="chevron-forward" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTHS.map((m, i) => {
              const isActive = i === month;
              const isFutureMonth =
                year > getYear(today) ||
                (year === getYear(today) && i > getMonth(today));
              return (
                <View key={m} style={styles.monthColumn}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isFutureMonth) setViewDate(setMonth(viewDate, i));
                    }}
                    style={[
                      styles.monthPill,
                      isActive &&
                        !isFutureMonth && {
                          backgroundColor: isDarkMode ? "#222" : "#f0f0f0",
                        },
                      isFutureMonth && { opacity: 0.25 },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          isActive && !isFutureMonth ? activeBlue : subColor,
                        fontWeight: "bold",
                        fontSize: 15,
                      }}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          <View style={styles.divider} />
          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={[styles.weekLabel, { color: subColor }]}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.dayGrid}>
            {calendarDays.map((day, i) => {
              const inMonth = isSameMonth(day, viewDate);
              const isSelected = isSameDay(day, currentDate);
              const isToday = isSameDay(day, today);
              const isFuture = day > today;
              return (
                <View key={i} style={styles.dayColumn}>
                  {inMonth ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (!isFuture) {
                          onSelectDate(day);
                          onClose();
                        }
                      }}
                      style={[
                        styles.dayCell,
                        isSelected &&
                          !isFuture && { backgroundColor: activeBlue },
                        isFuture && { opacity: 0.25 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color:
                              isSelected && !isFuture
                                ? "#fff"
                                : isToday
                                  ? activeBlue
                                  : textColor,
                          },
                        ]}
                      >
                        {format(day, "d")}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={{ color: activeBlue, fontWeight: "bold" }}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
}

function TransactionItem({ item, theme, currency, navigation }) {
  const isExpense = item.type === "expense";

  return (
    <TouchableOpacity
      style={[
        styles.txCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      // We use "Details" because that is the name in App.js
      // We pass { item } because DetailsScreen.js expects route.params.item
      onPress={() => navigation.navigate("Details", { item })}
    >
      <View
        style={[
          styles.circleIconBtn,
          {
            backgroundColor: isExpense ? "#ff3b3022" : "#34c75922",
            marginLeft: 0,
            width: 36,
            height: 36,
          },
        ]}
      >
        <Ionicons
          name={isExpense ? "arrow-down" : "arrow-up"}
          size={18}
          color={isExpense ? "#ff3b30" : "#34c759"}
        />
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        {/* CATEGORY (Bold Title) */}
        <Text style={[styles.txTitle, { color: theme.text }]}>
          {item.sub_category || "Uncategorized"}
        </Text>

        {/* TIME - NOTE (Subtext) */}
        <Text
          style={[styles.txNote, { color: theme.subText }]}
          numberOfLines={1}
        >
          {/* This line adds the time */}
          {item.created_at ? format(new Date(item.created_at), "h:mm a") : ""}
          {/* This line adds the bullet and the note if it exists */}
          {item.notes ? ` • ${item.notes}` : ""}
        </Text>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={[
            styles.txAmount,
            { color: isExpense ? "#ff3b30" : "#34c759" },
          ]}
        >
          {isExpense ? "-" : "+"}
          {currency}
          {item.amount.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// --- MAIN HOME SCREEN ---
export default function HomeScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [searchType, setSearchType] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Search date states declared here (before the useMemo that uses them)
  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const [searchStartCalVisible, setSearchStartCalVisible] = useState(false);
  const [searchEndCalVisible, setSearchEndCalVisible] = useState(false);

  const { currency, isGuest, isDarkMode, user } = useStore();
  const scrollRef = useRef(null);
  const selectionSource = useRef("system");
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const ITEM_WIDTH = 63;

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate),
    });
  }, [selectedDate]);

  // Auto-scroll logic for horizontal date strip
  useEffect(() => {
    if (selectionSource.current !== "strip" && scrollRef.current) {
      const index = daysInMonth.findIndex((day) =>
        isSameDay(day, selectedDate),
      );
      if (index !== -1) {
        const scrollToX =
          index * ITEM_WIDTH - SCREEN_WIDTH / 2 + ITEM_WIDTH / 2;
        scrollRef.current.scrollTo({ x: scrollToX, animated: false });
      }
    }
    selectionSource.current = "system";
  }, [selectedDate, daysInMonth]);

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTransactions(data);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions]),
  );

  // Date/Type Filter for Main List
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const matchesDate = isSameDay(new Date(t.created_at), selectedDate);
        const matchesFilter = activeFilter === "all" || t.type === activeFilter;
        return matchesDate && matchesFilter;
      }),
    [transactions, selectedDate, activeFilter],
  );

  // Search Results Filter
  const searchResults = useMemo(
    () =>
      transactions.filter((t) => {
        const q = searchQuery.toLowerCase();
        const txDate = startOfDay(new Date(t.created_at));
        const matchesSearch =
          !q ||
          ((searchType === "all" || searchType === "sub_category") &&
            t.sub_category?.toLowerCase().includes(q)) ||
          ((searchType === "all" || searchType === "notes") &&
            t.notes?.toLowerCase().includes(q)) ||
          ((searchType === "all" || searchType === "amount") &&
            String(t.amount).includes(q));

        const matchesStart = searchStartDate
          ? txDate >= startOfDay(searchStartDate)
          : true;
        const matchesEnd = searchEndDate
          ? txDate <= startOfDay(searchEndDate)
          : true;
        return matchesSearch && matchesStart && matchesEnd;
      }),
    [transactions, searchQuery, searchType, searchStartDate, searchEndDate],
  );

  useEffect(() => {
    const backAction = () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery("");
        return true;
      }

      return false;
    };

    // Add the listener
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [isSearchOpen]);

  const income = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [filteredTransactions],
  );
  const expense = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [filteredTransactions],
  );

  // Unified Theme Colors
  const theme = {
    bg: isDarkMode ? "#121212" : "#ffffff",
    card: isDarkMode ? "#1e1e1e" : "#f9f9f9",
    text: isDarkMode ? "#ffffff" : "#000000",
    border: isDarkMode ? "#2c2c2c" : "#f0f0f0",
    subText: isDarkMode ? "#888888" : "#8e8e93",
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* HEADER SECTION */}
      <View style={[styles.headerContainer, { backgroundColor: theme.bg }]}>
        <View style={styles.headerMainRow}>
          {!isSearchOpen && (
            <TouchableOpacity
              style={styles.monthSelectorTrigger}
              onPress={() => setCalendarVisible(true)}
            >
              <Text style={styles.yearSubLabel}>
                {format(selectedDate, "yyyy")}
              </Text>
              <View style={styles.monthDisplayRow}>
                <Text style={[styles.monthLargeText, { color: theme.text }]}>
                  {format(selectedDate, "MMMM")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={theme.text}
                  style={{ marginLeft: 6, marginTop: 4 }}
                />
              </View>
            </TouchableOpacity>
          )}

          {!isSearchOpen && (
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => setIsSearchOpen(true)}
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
                ]}
              >
                <Ionicons name="search" size={20} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* FULL SCREEN SEARCH OVERLAY */}
      {isSearchOpen && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 99, backgroundColor: theme.bg },
          ]}
        >
          <View style={styles.searchActiveContainer}>
            <View
              style={[
                styles.searchBarContainer,
                { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
              ]}
            >
              <Ionicons name="search" size={18} color="#888" />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder={`Search by ${searchType === "all" ? "anything" : searchType}...`}
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close-circle" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* SEARCH FILTERS */}
            <View style={styles.searchTypeRow}>
              {["all", "Category", "Notes", "Amount"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSearchType(type)}
                  style={[
                    styles.searchTypeChip,
                    searchType === type && {
                      backgroundColor: isDarkMode ? "#fff" : "#000",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.searchTypeChipText,
                      {
                        color:
                          searchType === type
                            ? isDarkMode
                              ? "#000"
                              : "#fff"
                            : "#888",
                      },
                    ]}
                  >
                    {type === "all" ? "All" : type.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SEARCH RESULTS */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={{ marginTop: 10 }}
              renderItem={({ item, index }) => (
                <TransactionItem
                  item={item}
                  index={index}
                  theme={theme}
                  currency={currency}
                  isGuest={isGuest}
                  isSearchOpen={isSearchOpen}
                  navigation={navigation}
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { marginTop: 40 }]}>
                  No results found
                </Text>
              }
            />
          </View>
        </View>
      )}

      {/* MAIN SCREEN DATE STRIP */}
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

      {/* SUMMARY CARD */}
      <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryVal, { color: "#34c759" }]}>
            +{currency}
            {income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryVal, { color: "#ff3b30" }]}>
            -{currency}
            {expense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Balance</Text>
          <Text style={[styles.summaryVal, { color: theme.text }]}>
            {currency}
            {(income - expense).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* MAIN LIST */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <TransactionItem
            item={item}
            index={index}
            theme={theme}
            currency={currency}
            isGuest={isGuest}
            isSearchOpen={isSearchOpen}
            navigation={navigation}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { marginTop: 100 }]}>
            No records for this day
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* CALENDAR MODAL */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        currentDate={selectedDate}
        onSelectDate={(date) => {
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
  headerContainer: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10 },
  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  yearSubLabel: { fontSize: 14, color: "#777", fontWeight: "700" },
  monthDisplayRow: { flexDirection: "row", alignItems: "center" },
  monthLargeText: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
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
  txIcon: { marginRight: 15 },
  txTitle: { fontWeight: "bold", fontSize: 14 },
  txNote: { fontSize: 12 },
  txAmount: { fontWeight: "bold", fontSize: 16 },
  emptyText: { textAlign: "center", color: "#666", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  calendarSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#333",
    alignSelf: "center",
    marginBottom: 20,
  },
  calNavRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  calNavTitle: { fontSize: 22, fontWeight: "800", marginHorizontal: 30 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  monthColumn: {
    width: "25%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  monthPill: {
    width: "90%",
    height: "85%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: { height: 1, backgroundColor: "#222", marginVertical: 15 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 5,
  },
  weekLabel: { width: 45, textAlign: "center", fontSize: 13 },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayColumn: {
    width: "14.28%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNum: { fontSize: 18, fontWeight: "700" },
  doneBtn: { alignItems: "center", marginTop: 10 },
  fullCloseOverlay: { ...StyleSheet.absoluteFillObject },
  searchActiveContainer: {
    paddingTop: 55,
    paddingHorizontal: 20,
    height: "100%",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
  },
  searchInput: { flex: 1, fontSize: 16, paddingHorizontal: 10 },
  searchTypeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 15 },
  searchTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchTypeChipText: { fontSize: 12, fontWeight: "600" },
});
