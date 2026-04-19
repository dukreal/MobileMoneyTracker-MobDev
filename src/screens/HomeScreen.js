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
  isAfter,
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

// --- 1. CALENDAR MODAL ---
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

  const today = startOfDay(new Date());
  const year = getYear(viewDate);
  const month = getMonth(viewDate);
  const currentYear = getYear(today);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  const isFutureDay = (day) => isAfter(startOfDay(day), today);
  const isFutureMonth = (monthIndex) => {
    const testDate = setMonth(new Date(year, 0, 1), monthIndex);
    return isAfter(startOfMonth(testDate), startOfMonth(today));
  };
  const isFutureYear = year > currentYear;

  const textColor = isDarkMode ? "#fff" : "#000";
  const activeBlue = "#0081db";

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
              onPress={() =>
                !isFutureYear && setViewDate(addYears(viewDate, 1))
              }
              disabled={isFutureYear}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={isFutureYear ? "#444" : textColor}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.monthGrid}>
            {MONTHS.map((m, i) => {
              const futureMonth = isFutureMonth(i);
              return (
                <View key={m} style={styles.monthColumn}>
                  <TouchableOpacity
                    onPress={() =>
                      !futureMonth && setViewDate(setMonth(viewDate, i))
                    }
                    disabled={futureMonth}
                    style={[
                      styles.monthPill,
                      i === month && {
                        backgroundColor: isDarkMode ? "#222" : "#f0f0f0",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: futureMonth
                          ? "#444"
                          : i === month && year === getYear(today)
                            ? activeBlue
                            : "#666",
                        fontWeight: "bold",
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
          <View style={styles.dayGrid}>
            {calendarDays.map((day, i) => {
              const future = isFutureDay(day);
              return (
                <View key={i} style={styles.dayColumn}>
                  {isSameMonth(day, viewDate) ? (
                    <TouchableOpacity
                      onPress={() => {
                        if (future) return;
                        onSelectDate(day);
                        onClose();
                      }}
                      disabled={future}
                      style={[
                        styles.dayCell,
                        isSameDay(day, currentDate) && {
                          backgroundColor: activeBlue,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          {
                            color: future
                              ? "#444"
                              : isSameDay(day, currentDate)
                                ? "#fff"
                                : isSameDay(day, today)
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
  if (isGuest && index > 7 && !isSearchOpen) {
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
        style={[styles.txAmount, { color: isExpense ? "#ff3b30" : "#34c759" }]}
      >
        {isExpense ? "-" : "+"}
        {currency}
        {item.amount.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

// --- 3. MAIN HOME SCREEN ---
export default function HomeScreen({ navigation, route }) {
  const { currency, isGuest, isDarkMode, user } = useStore();

  // States
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTypes, setSearchTypes] = useState(["all"]);
  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const [startCalVisible, setStartCalVisible] = useState(false);
  const [endCalVisible, setEndCalVisible] = useState(false);
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

  useEffect(() => {
    const backAction = () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return true;
      }
      return false;
    };
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => handler.remove();
  }, [isSearchOpen]);

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

  // Combined Filters
  const searchResults = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase();
      const txDate = startOfDay(new Date(t.created_at));
      const matchesDate =
        searchStartDate || searchEndDate
          ? true
          : isSameDay(txDate, selectedDate);
      const matchesSearch =
        !q ||
        (searchTypes.includes("all") &&
          (t.sub_category?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q) ||
            String(t.amount).includes(q))) ||
        (searchTypes.includes("sub_category") &&
          t.sub_category?.toLowerCase().includes(q)) ||
        (searchTypes.includes("notes") && t.notes?.toLowerCase().includes(q)) ||
        (searchTypes.includes("amount") && String(t.amount).includes(q));
      const matchesStart =
        !searchStartDate || txDate >= startOfDay(searchStartDate);
      const matchesEnd = !searchEndDate || txDate <= startOfDay(searchEndDate);
      return matchesDate && matchesSearch && matchesStart && matchesEnd;
    });
  }, [
    transactions,
    searchQuery,
    searchTypes,
    searchStartDate,
    searchEndDate,
    selectedDate,
  ]);

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
        {!isSearchOpen && (
          <View style={styles.appNameRow}>
            <Text style={[styles.appNameText, { color: theme.text }]}>
              Montra
            </Text>
          </View>
        )}

        {/* Row 2 — Year | Month + Icons */}
        {/* Row 2 — Year+Month | Icons */}
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
                onPress={() => {}}
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* SEARCH OVERLAY */}
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
                placeholder="Search..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setIsSearchOpen(false)}>
                <Ionicons name="close-circle" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* MODERN FILTER CHIPS + CALENDAR */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 6 }}
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 2,
                gap: 6,
              }}
            >
              {[
                { id: "all", label: "All", icon: "search-outline" },
                {
                  id: "sub_category",
                  label: "Category",
                  icon: "pricetag-outline",
                },
                {
                  id: "notes",
                  label: "Notes",
                  icon: "document-text-outline",
                },
                { id: "amount", label: "Amount", icon: "cash-outline" },
              ].map((item) => {
                const isActive = searchTypes.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.id === "all") {
                        setSearchTypes(["all"]);
                      } else {
                        setSearchTypes((prev) => {
                          const withoutAll = prev.filter((t) => t !== "all");
                          if (withoutAll.includes(item.id)) {
                            const next = withoutAll.filter(
                              (t) => t !== item.id,
                            );
                            return next.length === 0 ? ["all"] : next;
                          } else {
                            const next = [...withoutAll, item.id];
                            const allFields = [
                              "sub_category",
                              "notes",
                              "amount",
                            ];
                            const hasAll = allFields.every((f) =>
                              next.includes(f),
                            );
                            return hasAll ? ["all"] : next;
                          }
                        });
                      }
                    }}
                    style={[
                      styles.searchTypeChip,
                      {
                        backgroundColor: isActive
                          ? isDarkMode
                            ? "#fff"
                            : "#000"
                          : theme.chipUnselected,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={isActive ? (isDarkMode ? "#000" : "#fff") : "#888"}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.searchTypeChipText,
                        {
                          color: isActive
                            ? isDarkMode
                              ? "#000"
                              : "#fff"
                            : "#888",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() =>
                  searchStartDate || searchEndDate
                    ? (setSearchStartDate(null), setSearchEndDate(null))
                    : setStartCalVisible(true)
                }
                style={[
                  styles.searchTypeChip,
                  {
                    backgroundColor:
                      searchStartDate || searchEndDate
                        ? "#0081db"
                        : isDarkMode
                          ? "#1a1a1a"
                          : "#f0f0f0",
                  },
                ]}
              >
                <Ionicons
                  name={
                    searchStartDate || searchEndDate
                      ? "close"
                      : "calendar-outline"
                  }
                  size={18}
                  color={
                    searchStartDate || searchEndDate
                      ? "#fff"
                      : isDarkMode
                        ? "#fff"
                        : "#000"
                  }
                />
              </TouchableOpacity>
            </ScrollView>

            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TransactionItem
                  item={item}
                  index={index}
                  theme={theme}
                  currency={currency}
                  navigation={navigation}
                  isSearchOpen={true}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={{ color: theme.subText }}>
                    {searchQuery ? "No results" : "Start typing to search..."}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      )}

      {/* MAIN VIEW: DATE STRIP */}
      {!isSearchOpen && (
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
      )}

      {/* SUMMARY */}
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

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredTransactions.length === 0
            ? { flexGrow: 1 }
            : { paddingBottom: 100 }
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
      <CalendarModal
        visible={startCalVisible}
        onClose={() => setStartCalVisible(false)}
        currentDate={searchStartDate || new Date()}
        onSelectDate={setSearchStartDate}
        isDarkMode={isDarkMode}
      />
      <CalendarModal
        visible={endCalVisible}
        onClose={() => setEndCalVisible(false)}
        currentDate={searchEndDate || new Date()}
        onSelectDate={setSearchEndDate}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10 },
  appNameRow: { alignItems: "center", marginBottom: 10 },
  appNameText: { fontSize: 26, fontWeight: "900", letterSpacing: 0.5 },
  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  yearSubLabel: { fontSize: 13, color: "#777", fontWeight: "700" },
  monthLargeText: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  monthDisplayRow: { flexDirection: "row", alignItems: "center" },
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
  searchActiveContainer: { paddingTop: 45, paddingHorizontal: 20, flex: 1 },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
    marginBottom: 6,
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
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayColumn: {
    width: "14.28%",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNum: { fontSize: 16, fontWeight: "700" },
  doneBtn: { alignItems: "center", marginTop: 10 },
  fullCloseOverlay: { ...StyleSheet.absoluteFillObject },
});
