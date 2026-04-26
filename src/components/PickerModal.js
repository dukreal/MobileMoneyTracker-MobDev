import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  addWeeks,
  startOfYear,
  isSameWeek,
} from "date-fns";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MONTHS_SHORT = [
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
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PickerModal({
  visible,
  onClose,
  mode = "date",
  currentValue,
  onSelect,
  isDarkMode,
}) {
  const insets = useSafeAreaInsets();
  const activeBlue = "#0081db";
  const [viewDate, setViewDate] = useState(new Date());

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      if (currentValue instanceof Date) setViewDate(currentValue);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    subText: isDarkMode ? "#666" : "#999",
    border: isDarkMode ? "#333" : "#eee",
    handle: isDarkMode ? "#444" : "#ddd",
    itemBg: isDarkMode ? "#1e1e1e" : "#f5f5f5",
  };

  const years = useMemo(() => {
    const res = [];
    for (let i = new Date().getFullYear(); i >= 2021; i--) res.push(i);
    return res;
  }, []);

  const weeks = useMemo(() => {
    const res = [];
    const today = new Date();
    let currentCursor = startOfWeek(today, { weekStartsOn: 1 });
    const stopDate = startOfYear(subYears(today, 0));
    let lastMonthSeen = -1;

    while (!isAfter(stopDate, currentCursor)) {
      const monthIdx = getMonth(currentCursor);
      if (monthIdx !== lastMonthSeen) {
        res.push({ type: "header", label: format(currentCursor, "MMMM yyyy") });
        lastMonthSeen = monthIdx;
      }
      res.push({
        type: "week",
        start: currentCursor,
        end: endOfWeek(currentCursor, { weekStartsOn: 1 }),
      });
      currentCursor = addWeeks(currentCursor, -1);
    }
    return res;
  }, []);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [viewDate]);

  // --- FIXED YEAR GRID ---
  const renderYearGrid = () => (
    <FlatList
      data={years}
      numColumns={3}
      columnWrapperStyle={{ gap: 10, marginBottom: 12 }}
      keyExtractor={(item) => item.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.gridItem,
            {
              backgroundColor:
                item === currentValue ? activeBlue : theme.itemBg,
            },
          ]}
          onPress={() => {
            onSelect(item);
            handleClose();
          }}
        >
          <Text
            style={{
              color: item === currentValue ? "#fff" : theme.text,
              fontWeight: "700",
            }}
          >
            {item}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  const renderWeekList = () => (
    <FlatList
      data={weeks}
      keyExtractor={(item, index) => index.toString()}
      style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => {
        if (item.type === "header") {
          return (
            <View style={styles.weekHeader}>
              <View style={[styles.weekHeaderLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.weekHeaderText, { color: theme.subText, backgroundColor: theme.bg }]}>
                {item.label}
              </Text>
              <View style={[styles.weekHeaderLine, { backgroundColor: theme.border }]} />
            </View>
          );
        }

        const isSelected = isSameWeek(item.start, currentValue, { weekStartsOn: 1 });
        const isToday = isSameWeek(item.start, new Date(), { weekStartsOn: 1 });

        return (
          <TouchableOpacity
            style={[
              styles.weekCard,
              { backgroundColor: isSelected ? activeBlue + "15" : theme.itemBg },
              isSelected && { borderColor: activeBlue, borderWidth: 1.5 }
            ]}
            onPress={() => {
              onSelect(item.start);
              handleClose();
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.weekDateRange, { color: isSelected ? activeBlue : theme.text }]}>
                  {format(item.start, "MMM d")} – {format(item.end, "MMM d")}
                </Text>
                {isToday && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}> CURRENT</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.weekFullYear, { color: theme.subText }]}>
                {format(item.start, "yyyy")}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
               {isSelected ? (
                 <Ionicons name="checkmark-circle" size={24} color={activeBlue} />
               ) : (
                 <Ionicons name="chevron-forward" size={18} color={theme.subText} />
               )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );

  const renderCalendar = (isMonthOnly) => (
    <View>
      <View style={styles.calNavRow}>
        <TouchableOpacity onPress={() => setViewDate(subYears(viewDate, 1))}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.calNavTitle, { color: theme.text }]}>
          {getYear(viewDate)}
        </Text>
        <TouchableOpacity
          onPress={() => setViewDate(addYears(viewDate, 1))}
          disabled={getYear(viewDate) >= new Date().getFullYear()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              getYear(viewDate) >= new Date().getFullYear()
                ? theme.subText
                : theme.text
            }
          />
        </TouchableOpacity>
      </View>
      <View style={styles.monthGrid}>
        {MONTHS_SHORT.map((m, i) => {
          const isSelected =
            i === getMonth(viewDate) && isSameMonth(viewDate, currentValue);
          const today = new Date();
          const isThisYear = getYear(viewDate) === today.getFullYear();
          const isFutureMonth = isThisYear && i > today.getMonth();
          return (
            <TouchableOpacity
              key={m}
              disabled={isFutureMonth}
              style={[
                styles.monthPill,
                {
                  width: "23%",
                  backgroundColor: isSelected ? activeBlue : "transparent",
                  opacity: isFutureMonth ? 0.3 : 1,
                },
              ]}
              onPress={() => {
                if (isFutureMonth) return;
                const d = setMonth(viewDate, i);
                setViewDate(d);
                if (isMonthOnly) {
                  onSelect(d);
                  handleClose();
                }
              }}
            >
              <Text
                style={{
                  color: isSelected
                    ? "#fff"
                    : isFutureMonth
                      ? theme.subText
                      : theme.text,
                  fontWeight: "700",
                }}
              >
                {m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!isMonthOnly && (
        <View style={styles.dayGrid}>
          {WEEK_DAYS.map((d) => (
            <Text key={d} style={styles.dayHeader}>
              {d}
            </Text>
          ))}
          {calendarDays.map((day, i) => {
            const isSelected = isSameDay(day, currentValue);
            const inMonth = isSameMonth(day, viewDate);
            const isFutureDay = isAfter(
              startOfDay(day),
              startOfDay(new Date()),
            );
            return (
              <TouchableOpacity
                key={i}
                disabled={!inMonth || isFutureDay}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: activeBlue },
                  { opacity: isFutureDay ? 0.3 : 1 },
                ]}
                onPress={() => {
                  if (isFutureDay) return;
                  onSelect(day);
                  handleClose();
                }}
              >
                {inMonth && (
                  <Text
                    style={{
                      color: isSelected
                        ? "#fff"
                        : isFutureDay
                          ? theme.subText
                          : theme.text,
                    }}
                  >
                    {format(day, "d")}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.6)", opacity: overlayOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetTranslateY }],
              backgroundColor: theme.bg,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.handle }]} />
          <Text style={[styles.title, { color: theme.text }]}>
            Select {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
          <View style={styles.content}>
            {mode === "year" && renderYearGrid()}
            {mode === "week" && renderWeekList()}
            {mode === "month" && renderCalendar(true)}
            {mode === "date" && renderCalendar(false)}
          </View>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.doneBtn}
          >
            <Text
              style={{ color: activeBlue, fontWeight: "700", fontSize: 16 }}
            >
              Done
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 0, // MUST be 0 so the button can handle the bottom space
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 15,
  },
  content: { marginBottom: 10 },
  gridItem: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  weekRow: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  calNavRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  calNavTitle: { fontSize: 20, fontWeight: "800", marginHorizontal: 40 },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  monthPill: {
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
    paddingTop: 10,
  },
  dayHeader: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    marginBottom: 5,
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
    paddingHorizontal: 10,
  },
  weekHeaderLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  weekHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    paddingHorizontal: 10,
    textAlign: "center",
  },
  weekCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  weekDateRange: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  weekFullYear: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.8,
  },
    currentBadge: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
});
