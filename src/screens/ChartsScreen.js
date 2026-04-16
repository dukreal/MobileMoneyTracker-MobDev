import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

export default function ChartsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [viewLevel, setViewLevel] = useState("year");
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Extract isDarkMode and isGuest from store
  const { isGuest, isDarkMode } = useStore();

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from("transactions").select("*");
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.log("Fetch Error:", err.message);
      setTransactions([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, []),
  );

  const yearData = useMemo(() => {
    const months = [
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
    const currentYear = new Date().getFullYear();
    const chartData = [];

    months.forEach((monthStr, index) => {
      const monthlyTxs = transactions.filter((t) => {
        const d = new Date(t.created_at);
        return d.getMonth() === index && d.getFullYear() === currentYear;
      });

      const income = monthlyTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);

      const expense = monthlyTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0);

      // --- THE FIXED SLOT LOGIC ---
      chartData.push({
        value: income > 0 ? income : 0.1,
        label: monthStr,
        spacing: 4,
        frontColor: income > 0 ? "#34c759" : "transparent",
      });

      chartData.push({
        value: expense > 0 ? expense : 0.1,
        frontColor: expense > 0 ? "#ff3b30" : "transparent",
      });
    });

    return chartData;
  }, [transactions]);

  // Guest Logic Lock
  if (false && isGuest) {
    return (
      <View
        style={[styles.center, isDarkMode && { backgroundColor: "#121212" }]}
      >
        <Ionicons
          name="lock-closed"
          size={64}
          color={isDarkMode ? "#444" : "#ccc"}
        />
        <Text style={[styles.lockTitle, isDarkMode && { color: "#fff" }]}>
          Yearly Analytics Locked
        </Text>
        <Text style={styles.lockSub}>
          Please log in to see your financial trends.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
    >
      <Text style={[styles.title, isDarkMode && { color: "#fff" }]}>
        {viewLevel === "year"
          ? "Yearly Breakdown"
          : `Details for ${selectedMonth}`}
      </Text>

      {viewLevel === "year" ? (
        <View style={styles.chartWrapper}>
          {yearData && yearData.length > 0 ? (
            <View style={{ alignItems: "center" }}>
              <BarChart
                data={yearData}
                barWidth={20}
                spacing={35}
                noOfSections={4}
                barBorderRadius={4}
                hideRules
                yAxisThickness={0}
                xAxisThickness={1}
                // Axis color changes based on mode
                xAxisColor={isDarkMode ? "#333" : "#eee"}
                yAxisTextStyle={{
                  color: isDarkMode ? "#888" : "gray",
                  fontSize: 10,
                }}
                yAxisLabelContainerStyle={{ width: 45 }}
                // --- YOUR CUSTOM CENTERING MATH ---
                xAxisLabelShift={22}
                xAxisLabelTextStyle={{
                  color: isDarkMode ? "#888" : "gray",
                  fontSize: 10,
                  width: 125,
                  textAlign: "center",
                  marginLeft: -40,
                }}
                // ------------------------------------

                height={220}
                width={screenWidth - 40}
                maxValue={Math.max(...yearData.map((d) => d.value || 0), 100)}
              />
            </View>
          ) : (
            <ActivityIndicator
              size="large"
              color={isDarkMode ? "#fff" : "#000"}
            />
          )}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#34c759" }]} />
              <Text
                style={{ fontSize: 12, color: isDarkMode ? "#fff" : "#000" }}
              >
                {" "}
                Income
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: "#ff3b30" }]} />
              <Text
                style={{ fontSize: 12, color: isDarkMode ? "#fff" : "#000" }}
              >
                {" "}
                Expense
              </Text>
            </View>
          </View>
          <Text style={[styles.hintText, isDarkMode && { color: "#444" }]}>
            Swipe left/right to see all months
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.monthView,
            isDarkMode && { backgroundColor: "#1e1e1e" },
          ]}
        >
          <TouchableOpacity
            onPress={() => setViewLevel("year")}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← Back to Year View</Text>
          </TouchableOpacity>
          <Text style={[styles.infoText, isDarkMode && { color: "#aaa" }]}>
            Detailed view for {selectedMonth} coming soon!
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  chartWrapper: { paddingBottom: 50 },
  legend: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 5 },
  hintText: { textAlign: "center", color: "#ccc", marginTop: 30, fontSize: 12 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  lockTitle: { fontSize: 22, fontWeight: "bold", marginTop: 20 },
  lockSub: { textAlign: "center", color: "#999", marginTop: 10 },
  monthView: { padding: 20, backgroundColor: "#f9f9f9", borderRadius: 20 },
  backBtn: { marginBottom: 20 },
  backText: { color: "#007AFF", fontWeight: "bold" },
  infoText: { textAlign: "center", color: "#666" },
});
