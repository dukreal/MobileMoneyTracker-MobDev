import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { PieChart } from "react-native-gifted-charts";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  isSameWeek,
  isSameMonth,
  startOfDay,
} from "date-fns";
import { CATEGORIES } from "../constants/Categories";

const getCatIcon = (parentCategory) => {
  const found =
    CATEGORIES.expense.find((c) => c.name === parentCategory) ||
    CATEGORIES.income.find((c) => c.name === parentCategory);
  return found
    ? { icon: found.icon, color: found.color }
    : { icon: "ellipse", color: "#888" };
};
import CalendarModal from "../components/CalendarModal";

export default function ChartsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month");
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const { isGuest, isDarkMode, currency } = useStore();

  const theme = {
    bg: isDarkMode ? "#0f0f0f" : "#f2f2f7",
    surface: isDarkMode ? "#1c1c1e" : "#ffffff",
    surface2: isDarkMode ? "#2c2c2e" : "#f2f2f7",
    text: isDarkMode ? "#ffffff" : "#000000",
    subText: isDarkMode ? "#8e8e93" : "#8e8e93",
    border: isDarkMode ? "#38383a" : "#e5e5ea",
    accent: "#4A90E2",
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("transactions").select("*");
      if (error) throw error;
      setTransactions(data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      setSelectedSlice(null);
    }, []),
  );

  const filteredTxs = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.created_at);
      if (viewMode === "week") return isSameWeek(d, now, { weekStartsOn: 1 });
      if (viewMode === "month") return isSameMonth(d, selectedMonth);
      if (viewMode === "year") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [transactions, viewMode, selectedMonth]);

  const expenseTxs = useMemo(
    () => filteredTxs.filter((t) => t.type === "expense"),
    [filteredTxs],
  );
  const incomeTxs = useMemo(
    () => filteredTxs.filter((t) => t.type === "income"),
    [filteredTxs],
  );
  const totalExpense = useMemo(
    () => expenseTxs.reduce((s, t) => s + Number(t.amount), 0),
    [expenseTxs],
  );
  const totalIncome = useMemo(
    () => incomeTxs.reduce((s, t) => s + Number(t.amount), 0),
    [incomeTxs],
  );
  const netBalance = totalIncome - totalExpense;

  const pieData = useMemo(() => {
    if (expenseTxs.length === 0) return [];
    const grouped = {};
    expenseTxs.forEach((t) => {
      const cat = t.parent_category || "Other";
      if (!grouped[cat]) grouped[cat] = 0;
      grouped[cat] += Number(t.amount);
    });
    const getCatColor = (name) => {
      const found = CATEGORIES.expense.find((c) => c.name === name);
      return found?.color || "#888";
    };
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const othersTotal = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
    const result = top5.map(([name, value]) => ({
      value,
      color: getCatColor(name),
      text: "",
      label: name,
      focused: selectedSlice?.label === name,
    }));
    if (othersTotal > 0) {
      result.push({
        value: othersTotal,
        color: "#c4a35a",
        text: "",
        label: "Others",
        focused: selectedSlice?.label === "Others",
      });
    }
    return result;
  }, [expenseTxs, selectedSlice]);

  const periodLabel = useMemo(() => {
    const now = new Date();
    if (viewMode === "week") {
      const ws = startOfWeek(now, { weekStartsOn: 1 });
      const we = endOfWeek(now, { weekStartsOn: 1 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    if (viewMode === "month") return format(selectedMonth, "MMMM yyyy");
    return String(now.getFullYear());
  }, [viewMode, selectedMonth]);

  const drillTxs = useMemo(() => {
    if (!selectedSlice) return [];
    if (selectedSlice.label === "Others") {
      const top5Labels = [...pieData]
        .filter((i) => i.label !== "Others")
        .map((i) => i.label);
      return expenseTxs
        .filter((t) => !top5Labels.includes(t.parent_category))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return expenseTxs
      .filter((t) => t.parent_category === selectedSlice.label)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [selectedSlice, expenseTxs, pieData]);

  if (isGuest) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <View style={[styles.lockCard, { backgroundColor: theme.surface }]}>
          <View
            style={[
              styles.lockIconCircle,
              { backgroundColor: isDarkMode ? "#2c2c2e" : "#f2f2f7" },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={36}
              color={isDarkMode ? "#555" : "#c7c7cc"}
            />
          </View>
          <Text style={[styles.lockTitle, { color: theme.text }]}>
            Analytics Locked
          </Text>
          <Text style={[styles.lockSub, { color: theme.subText }]}>
            Log in to see your full financial analytics.
          </Text>
        </View>
      </View>
    );
  }

  const sortedPieData = [...pieData].sort((a, b) =>
    a.label === "Others" ? 1 : b.label === "Others" ? -1 : b.value - a.value,
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.bg }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Analytics
        </Text>
        {viewMode === "month" ? (
          <TouchableOpacity
            style={styles.periodBtn}
            onPress={() => setCalendarVisible(true)}
          >
            <Text style={[styles.periodLabel, { color: theme.accent }]}>
              {periodLabel}
            </Text>
            <Ionicons name="chevron-down" size={13} color={theme.accent} />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.periodLabel, { color: theme.subText }]}>
            {periodLabel}
          </Text>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* SEGMENT TOGGLE */}
        <View
          style={[styles.segmentWrapper, { backgroundColor: theme.surface2 }]}
        >
          {["week", "month", "year"].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.segmentBtn,
                viewMode === mode && {
                  backgroundColor: theme.surface,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                },
              ]}
              onPress={() => {
                setViewMode(mode);
                setSelectedSlice(null);
              }}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: viewMode === mode ? theme.text : theme.subText,
                    fontWeight: viewMode === mode ? "700" : "500",
                  },
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SUMMARY ROW */}
        <View style={[styles.summaryRow, { backgroundColor: theme.surface }]}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text
              style={[styles.summaryVal, { color: "#2ECC71" }]}
              numberOfLines={1}
            >
              +{currency}
              {totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text
              style={[styles.summaryVal, { color: "#FF6B6B" }]}
              numberOfLines={1}
            >
              -{currency}
              {totalExpense.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text
              style={[
                styles.summaryVal,
                { color: netBalance >= 0 ? "#2ECC71" : "#FF6B6B" },
              ]}
              numberOfLines={1}
            >
              {netBalance >= 0 ? "+" : "-"}
              {currency}
              {Math.abs(netBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* PIE CHART SECTION */}
        <View style={[styles.chartCard, { backgroundColor: theme.surface }]}>
          {/* Chart Header */}
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Expense Breakdown
              </Text>
              <Text style={[styles.chartSub, { color: theme.subText }]}>
                Top categories this period
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={theme.accent}
              style={{ marginVertical: 50 }}
            />
          ) : pieData.length === 0 ? (
            <View style={styles.emptyChart}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: theme.surface2 },
                ]}
              >
                <Ionicons
                  name="pie-chart-outline"
                  size={36}
                  color={theme.subText}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Expenses
              </Text>
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                No expense records for this period
              </Text>
            </View>
          ) : (
            <>
              {/* Pie + Legend side by side */}
              <View style={styles.pieAndLegendRow}>
                <PieChart
                  data={pieData}
                  donut
                  radius={85}
                  innerRadius={54}
                  strokeWidth={0}
                  innerCircleColor={theme.surface}
                  focusOnPress
                  onPress={(item) =>
                    setSelectedSlice(
                      selectedSlice?.label === item.label ? null : item,
                    )
                  }
                  centerLabelComponent={() => (
                    <View style={styles.centerLabel}>
                      {selectedSlice ? (
                        <>
                          <Text
                            style={[styles.centerAmount, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {currency}
                            {selectedSlice.value.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.centerPct,
                              { color: selectedSlice.color },
                            ]}
                          >
                            {totalExpense > 0
                              ? (
                                  (selectedSlice.value / totalExpense) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[styles.centerAmount, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {currency}
                            {totalExpense.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                            })}
                          </Text>
                          <Text
                            style={[styles.centerSub, { color: theme.subText }]}
                          >
                            Expenses
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                />

                {/* Inline Legend */}
                <View style={styles.inlineLegend}>
                  {sortedPieData.map((item) => {
                    const pct =
                      totalExpense > 0
                        ? ((item.value / totalExpense) * 100).toFixed(1)
                        : 0;
                    const isSelected = selectedSlice?.label === item.label;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[
                          styles.legendItem,
                          isSelected && {
                            backgroundColor: item.color + "15",
                            borderRadius: 8,
                          },
                        ]}
                        onPress={() =>
                          setSelectedSlice(isSelected ? null : item)
                        }
                      >
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: item.color },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.legendName, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                          <Text
                            style={[styles.legendPct, { color: theme.subText }]}
                          >
                            {pct}%
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </View>

        {/* DRILL DOWN */}
        {selectedSlice && drillTxs.length > 0 && (
          <View style={[styles.drillCard, { backgroundColor: theme.surface }]}>
            {/* Drill Header */}
            <View
              style={[
                styles.drillHeaderRow,
                { borderBottomColor: theme.border },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View
                  style={[
                    styles.drillIconCircle,
                    { backgroundColor: selectedSlice.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={getCatIcon(selectedSlice.label).icon}
                    size={16}
                    color={selectedSlice.color}
                  />
                </View>
                <View>
                  <Text style={[styles.drillTitle, { color: theme.text }]}>
                    {selectedSlice.label}
                  </Text>
                  <Text style={[styles.drillCount, { color: theme.subText }]}>
                    {drillTxs.length} transaction
                    {drillTxs.length !== 1 ? "s" : ""} · {currency}
                    {selectedSlice.value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSlice(null)}
                style={[
                  styles.drillCloseBtn,
                  { backgroundColor: theme.surface2 },
                ]}
              >
                <Ionicons name="close" size={16} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* Transaction List */}
            {drillTxs.map((tx, index) => (
              <TouchableOpacity
                key={tx.id}
                style={[
                  styles.txRow,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: index < drillTxs.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={() => navigation.navigate("Details", { item: tx })}
              >
                <View
                  style={[
                    styles.txIconCircle,
                    {
                      backgroundColor:
                        getCatIcon(tx.parent_category).color + "22",
                    },
                  ]}
                >
                  <Ionicons
                    name={tx.type === "income" ? "arrow-up" : "arrow-down"}
                    size={16}
                    color={getCatIcon(tx.parent_category).color}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[styles.txCategory, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {tx.sub_category || tx.parent_category}
                  </Text>
                  <Text style={[styles.txDate, { color: theme.subText }]}>
                    {tx.notes
                      ? tx.notes
                      : format(new Date(tx.created_at), "MMM d · h:mm a")}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.txAmount, { color: "#FF6B6B" }]}>
                    -{currency}
                    {Number(tx.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={[styles.txDate, { color: theme.subText }]}>
                    {format(new Date(tx.created_at), "MMM d")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        currentDate={selectedMonth}
        onSelectDate={(date) => {
          setSelectedMonth(startOfMonth(date));
          setSelectedSlice(null);
        }}
        isDarkMode={isDarkMode}
        hideDays
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },

  // Header
  header: {
    paddingTop: 58,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  periodBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  periodLabel: { fontSize: 13, fontWeight: "600" },

  // Segment
  segmentWrapper: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentText: { fontSize: 14 },

  // Summary
  summaryRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 11, color: "#999", marginBottom: 5 },
  summaryVal: { fontSize: 14, fontWeight: "bold" },

  // Chart card
  chartCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  chartTitle: { fontSize: 16, fontWeight: "800" },
  chartSub: { fontSize: 11, marginTop: 2 },
  totalBadge: {
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    minWidth: 70,
  },
  totalBadgeLabel: { fontSize: 10, fontWeight: "600" },
  totalBadgeAmount: { fontSize: 14, fontWeight: "800", marginTop: 2 },

  // Empty
  emptyChart: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13 },

  // Pie
  pieAndLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  centerLabel: {
    alignItems: "center",
    justifyContent: "center",
    width: 108,
    paddingHorizontal: 4,
  },
  centerAmount: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  centerSub: { fontSize: 10, textAlign: "center", marginTop: 2 },
  centerPct: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },

  // Legend
  inlineLegend: { flex: 1, gap: 2 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendName: { fontSize: 12, fontWeight: "600" },
  legendPct: { fontSize: 11, marginTop: 1 },

  // Category bars
  categoryBars: { borderTopWidth: 1, paddingTop: 16, gap: 12 },
  catBarRow: { gap: 6 },
  catBarLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  catBarDot: { width: 8, height: 8, borderRadius: 4 },
  catBarName: { flex: 1, fontSize: 12, fontWeight: "600" },
  catBarAmount: { fontSize: 12, fontWeight: "600" },
  catBarTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: 6, borderRadius: 3 },

  // Drill down
  drillCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  drillHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  drillIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  drillTitle: { fontSize: 15, fontWeight: "700" },
  drillCount: { fontSize: 11, marginTop: 2 },
  drillCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  // Transactions
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  txIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  txCategory: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: "700" },

  // Lock
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  lockCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  lockTitle: { fontSize: 20, fontWeight: "800" },
  lockSub: { textAlign: "center", fontSize: 14, lineHeight: 20 },
});
