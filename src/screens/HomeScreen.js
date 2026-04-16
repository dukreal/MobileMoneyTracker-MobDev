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
  addDays,
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

  const bg = isDarkMode ? "#000" : "#fff";
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
        {/* 2. The Dismissible Overlay (The area above the sheet that closes it) */}
        <Pressable style={styles.fullCloseOverlay} onPress={onClose} />

        {/* 3. The Calendar Sheet */}
        <Pressable
          style={[
            styles.calendarSheet,
            {
              backgroundColor: isDarkMode ? "#121212" : "#fff", // Synced to your Nav background
              borderColor: isDarkMode ? "#333" : "#eee",
            },
          ]}
          onPress={(e) => e.stopPropagation()} // Prevents clicks on the calendar from closing it
        >
          <View style={styles.handle} />

          {/* Year Nav Header */}
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

          {/* Fixed Month Grid */}
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
                      if (isFutureMonth) return;
                      setViewDate(setMonth(viewDate, i));
                    }}
                    activeOpacity={isFutureMonth ? 1 : 0.7}
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

          {/* Weekday Labels */}
          <View style={styles.weekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={[styles.weekLabel, { color: subColor }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Day Grid */}
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
                        if (isFuture) return;
                        onSelectDate(day);
                        onClose();
                      }}
                      activeOpacity={isFuture ? 1 : 0.7}
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

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text
              style={{ color: activeBlue, fontWeight: "bold", fontSize: 16 }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </Pressable>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [searchType, setSearchType] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const { currency, isGuest, isDarkMode } = useStore();
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

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error.message);
    } else {
      setTransactions(data || []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, []),
  );

  // Main list — never affected by search
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const matchesDate = isSameDay(new Date(t.created_at), selectedDate);
        const matchesFilter = activeFilter === "all" || t.type === activeFilter;
        return matchesDate && matchesFilter;
      }),
    [transactions, selectedDate, activeFilter],
  );

  const [searchStartDate, setSearchStartDate] = useState(null);
  const [searchEndDate, setSearchEndDate] = useState(null);
  const [searchStartCalVisible, setSearchStartCalVisible] = useState(false);
  const [searchEndCalVisible, setSearchEndCalVisible] = useState(false);

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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#121212" : "#fcfcfc" }, // Matches Tab Bar
      ]}
    >
      {/* Seamless Minimalist Header */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isDarkMode ? "#121212" : "#fcfcfc" }, // Matches Tab Bar
        ]}
      >
        <View style={styles.headerMainRow}>
          {/* Month & Year Selection (Left) */}
          {!isSearchOpen && (
            <TouchableOpacity
              style={styles.monthSelectorTrigger}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.yearSubLabel}>
                {format(selectedDate, "yyyy")}
              </Text>
              <View style={styles.monthDisplayRow}>
                <Text
                  style={[
                    styles.monthLargeText,
                    isDarkMode && { color: "#fff" },
                  ]}
                >
                  {format(selectedDate, "MMMM")}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={isDarkMode ? "#fff" : "#000"}
                  style={{ marginLeft: 6, marginTop: 4 }}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Search and Notif Icons (Right) */}
          {!isSearchOpen && (
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => setIsSearchOpen(true)}
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={isDarkMode ? "#fff" : "#000"}
                />
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
                  color={isDarkMode ? "#fff" : "#000"}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {/* Full-screen Search Overlay with Blur */}
      {isSearchOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 99 }]}>
          <View
            style={[
              styles.searchActiveContainer,
              {
                backgroundColor: isDarkMode ? "#121212" : "#fcfcfc",
              },
            ]}
          >
            <View
              style={[
                styles.searchBarContainer,
                { backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0" },
              ]}
            >
              <Ionicons name="search" size={18} color="#888" />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: isDarkMode ? "#fff" : "#000" },
                ]}
                placeholder={`Search by ${searchType === "all" ? "anything" : searchType.replace("_", " ")}...`}
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                onPress={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                  setSearchType("all");
                  setSearchStartDate(null);
                  setSearchEndDate(null);
                  setSearchStartCalVisible(false);
                  setSearchEndCalVisible(false);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Search Type Filters */}
            <View style={styles.searchTypeRow}>
              {[
                { id: "all", label: "All" },
                { id: "sub_category", label: "Category" },
                { id: "notes", label: "Notes" },
                { id: "amount", label: "Amount" },
              ].map((type) => (
                <TouchableOpacity
                  key={type.id}
                  onPress={() => setSearchType(type.id)}
                  style={[
                    styles.searchTypeChip,
                    searchType === type.id && {
                      backgroundColor: isDarkMode ? "#fff" : "#000",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.searchTypeChipText,
                      {
                        color:
                          searchType === type.id
                            ? isDarkMode
                              ? "#000"
                              : "#fff"
                            : "#888",
                      },
                    ]}
                  >
                    {type.id === "all" ? "All" : type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Range Filter */}
            <View style={styles.searchDateRow}>
              <View style={styles.searchDateField}>
                <Text
                  style={[
                    styles.searchDateLabel,
                    { color: isDarkMode ? "#888" : "#999" },
                  ]}
                >
                  From
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchStartCalVisible(true)}
                  style={[
                    styles.searchDateInput,
                    {
                      backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: searchStartDate
                        ? isDarkMode
                          ? "#fff"
                          : "#000"
                        : "#555",
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    {searchStartDate
                      ? format(searchStartDate, "MMM d, yyyy")
                      : "Start date"}
                  </Text>
                  {searchStartDate ? (
                    <TouchableOpacity onPress={() => setSearchStartDate(null)}>
                      <Ionicons name="close-circle" size={16} color="#888" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="calendar-outline" size={16} color="#888" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.searchDateField}>
                <Text
                  style={[
                    styles.searchDateLabel,
                    { color: isDarkMode ? "#888" : "#999" },
                  ]}
                >
                  To
                </Text>
                <TouchableOpacity
                  onPress={() => setSearchEndCalVisible(true)}
                  style={[
                    styles.searchDateInput,
                    {
                      backgroundColor: isDarkMode ? "#1a1a1a" : "#f0f0f0",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: searchEndDate
                        ? isDarkMode
                          ? "#fff"
                          : "#000"
                        : "#555",
                      fontSize: 13,
                      fontWeight: "500",
                    }}
                  >
                    {searchEndDate
                      ? format(searchEndDate, "MMM d, yyyy")
                      : "End date"}
                  </Text>
                  {searchEndDate ? (
                    <TouchableOpacity onPress={() => setSearchEndDate(null)}>
                      <Ionicons name="close-circle" size={16} color="#888" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="calendar-outline" size={16} color="#888" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Date Pickers */}
            <CalendarModal
              visible={searchStartCalVisible}
              onClose={() => setSearchStartCalVisible(false)}
              currentDate={searchStartDate || new Date()}
              onSelectDate={(date) => setSearchStartDate(startOfDay(date))}
              isDarkMode={isDarkMode}
            />
            <CalendarModal
              visible={searchEndCalVisible}
              onClose={() => setSearchEndCalVisible(false)}
              currentDate={searchEndDate || new Date()}
              onSelectDate={(date) => setSearchEndDate(startOfDay(date))}
              isDarkMode={isDarkMode}
            />

            {/* Search Results */}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              xq
              style={{ marginTop: 10 }}
              contentContainerStyle={
                filteredTransactions.length === 0
                  ? { flexGrow: 1 }
                  : { paddingBottom: 40 }
              }
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="search-outline"
                    size={60}
                    color={isDarkMode ? "#333" : "#e0e0e0"}
                    style={{ marginBottom: 15 }}
                  />
                  <Text
                    style={[styles.emptyText, isDarkMode && { color: "#444" }]}
                  >
                    {searchQuery
                      ? "No results found"
                      : "Start typing to search"}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.txCard,
                    isDarkMode && {
                      backgroundColor: "#1e1e1e",
                      borderColor: "#333",
                    },
                  ]}
                >
                  <View style={styles.txIcon}>
                    <Ionicons
                      name={
                        item.type === "income"
                          ? "arrow-down-circle"
                          : "arrow-up-circle"
                      }
                      size={28}
                      color={item.type === "income" ? "#34c759" : "#ff3b30"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.txTitle, isDarkMode && { color: "#fff" }]}
                    >
                      {item.sub_category}
                    </Text>
                    <Text
                      style={[styles.txNote, isDarkMode && { color: "#777" }]}
                    >
                      {item.notes || "No notes"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: item.type === "income" ? "#34c759" : "#ff3b30" },
                    ]}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {currency}
                    {item.amount.toFixed(2)}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      )}

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

      {/* Horizontal Date Picker */}
      <View
        style={[
          styles.dateStrip,
          isDarkMode && { backgroundColor: "#121212", borderColor: "#333" },
        ]}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {daysInMonth.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);

            // Logic to ensure text is visible in Dark Mode
            // If selected: Black text on White background.
            // If not selected: White text on Transparent background.
            const dateTextColor = isSelected
              ? isDarkMode
                ? "#000"
                : "#fff"
              : isDarkMode
                ? "#fff"
                : "#000";

            const subTextColor = isSelected
              ? isDarkMode
                ? "#000"
                : "#fff"
              : isDarkMode
                ? "#666"
                : "#999";

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateItem,
                  isSelected &&
                    (isDarkMode
                      ? styles.dateItemActiveDark
                      : styles.dateItemActive),
                ]}
                onPress={() => {
                  selectionSource.current = "strip";
                  setSelectedDate(day);
                }}
              >
                <Text style={[styles.dateDay, { color: subTextColor }]}>
                  {format(day, "EEE")}
                </Text>
                <Text style={[styles.dateNum, { color: dateTextColor }]}>
                  {format(day, "d")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: "all", label: "All", icon: "layers-outline" },
            {
              id: "income",
              label: "Income",
              icon: "arrow-down-circle-outline",
            },
            {
              id: "expense",
              label: "Expense",
              icon: "arrow-up-circle-outline",
            },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.filterChipActive,
                isDarkMode && {
                  backgroundColor:
                    activeFilter === filter.id ? "#fff" : "#1e1e1e",
                },
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Ionicons
                name={filter.icon}
                size={16}
                color={
                  activeFilter === filter.id
                    ? isDarkMode
                      ? "#000"
                      : "#fff"
                    : "#888"
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      activeFilter === filter.id
                        ? isDarkMode
                          ? "#000"
                          : "#fff"
                        : "#888",
                  },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary Card */}
      <View
        style={[
          styles.summaryCard,
          isDarkMode && { backgroundColor: "#1e1e1e", shadowColor: "#000" },
        ]}
      >
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, isDarkMode && { color: "#888" }]}>
            Income
          </Text>
          <Text style={[styles.summaryVal, { color: "#34c759" }]}>
            +{currency}
            {income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, isDarkMode && { color: "#888" }]}>
            Expense
          </Text>
          <Text style={[styles.summaryVal, { color: "#ff3b30" }]}>
            -{currency}
            {expense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={[styles.summaryLabel, isDarkMode && { color: "#888" }]}>
            Balance
          </Text>
          <Text
            style={[
              styles.summaryVal,
              isDarkMode ? { color: "#fff" } : { color: "#000" },
            ]}
          >
            {currency}
            {(income - expense).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredTransactions.length === 0 ? { flexGrow: 1 } : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={isDarkMode ? "#333" : "#e0e0e0"}
              style={{ marginBottom: 15 }}
            />
            <Text style={[styles.emptyText, isDarkMode && { color: "#444" }]}>
              {searchQuery ? "No results found" : "No records for this day"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          if (isGuest && index > 7) {
            return (
              <View
                style={[
                  styles.blurredCard,
                  isDarkMode && {
                    backgroundColor: "#1a1a1a",
                    borderColor: "#333",
                  },
                ]}
              >
                <Ionicons name="lock-closed" size={18} color="#666" />
                <Text
                  style={[styles.blurredText, isDarkMode && { color: "#666" }]}
                >
                  Login for full history
                </Text>
              </View>
            );
          }

          return (
            <View
              style={[
                styles.txCard,
                isDarkMode && {
                  backgroundColor: "#1e1e1e",
                  borderColor: "#333",
                },
              ]}
            >
              <View style={styles.txIcon}>
                <Ionicons
                  name={
                    item.type === "income"
                      ? "arrow-down-circle"
                      : "arrow-up-circle"
                  }
                  size={28}
                  color={item.type === "income" ? "#34c759" : "#ff3b30"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txTitle, isDarkMode && { color: "#fff" }]}>
                  {item.sub_category}
                </Text>
                <Text style={[styles.txNote, isDarkMode && { color: "#777" }]}>
                  {item.notes || "No notes"}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: item.type === "income" ? "#34c759" : "#ff3b30" },
                ]}
              >
                {item.type === "income" ? "+" : "-"}
                {currency}
                {item.amount.toFixed(2)}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Main Screen Layout ---
  container: {
    flex: 1,
    // backgroundColor handled inline to sync with isDarkMode
  },

  // --- Seamless Minimalist Header ---
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 5,
  },
  monthSelectorTrigger: {
    justifyContent: "flex-end",
  },
  yearSubLabel: {
    fontSize: 14,
    color: "#777",
    fontWeight: "700",
    marginBottom: -2,
  },
  monthDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthLargeText: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#fff",
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 52,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#fff",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  // --- Horizontal Date Strip ---
  dateStrip: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#2a2a2a", // Subtle line
    // Background handled by isDarkMode logic
  },
  dateItem: {
    width: 55,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  dateItemActive: {
    backgroundColor: "#fff",
  },
  dateItemActiveDark: {
    backgroundColor: "#fff",
  },
  dateDay: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dateNum: {
    fontSize: 16,
    fontWeight: "bold",
  },

  // --- Summary Card ---
  summaryCard: {
    flexDirection: "row",
    margin: 15,
    backgroundColor: "#1e1e1e", // Lighter than #121212 to stand out
    padding: 20,
    borderRadius: 20,
  },
  summaryCol: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 5,
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: "bold",
  },

  // --- Transaction List Items ---
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#1e1e1e", // Lighter than #121212 to stand out
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 15,
  },
  txIcon: {
    marginRight: 15,
  },
  txTitle: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#fff",
  },
  txNote: {
    fontSize: 12,
    color: "#777",
  },
  txAmount: {
    fontWeight: "bold",
    fontSize: 16,
  },

  // --- Rest of styles (Modal, etc.) stay the same ---
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: "center",
    color: "#ccc",
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  calendarSheet: {
    width: "100%",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
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
  calNavTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginHorizontal: 30,
    textAlign: "center",
    minWidth: 80,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    marginBottom: 10,
  },
  monthColumn: {
    width: "25%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  monthPill: {
    width: "90%",
    height: "85%",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#222",
    width: "100%",
    marginVertical: 15,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 5,
  },
  weekLabel: {
    width: 45,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
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
  dayNum: {
    fontSize: 18,
    fontWeight: "700",
  },
  doneBtn: {
    alignItems: "center",
    marginTop: 10,
    paddingVertical: 10,
  },
  filterRow: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#f0f0f0", // Light mode default
  },
  filterChipActive: {
    backgroundColor: "#000", // Light mode active
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fullCloseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  // --- Enhanced Search Styles ---
  searchActiveContainer: {
    paddingTop: 55,
    paddingHorizontal: 20,
    height: "100%",
  },
  searchTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 15,
  },
  searchTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchTypeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchDateRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  searchDateField: {
    flex: 1,
  },
  searchDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchDateInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "500",
  },
});
