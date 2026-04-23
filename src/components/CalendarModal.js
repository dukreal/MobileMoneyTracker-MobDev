import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarModal({
  visible,
  onClose,
  currentDate,
  onSelectDate,
  isDarkMode,
  hideDays,
}) {
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };
  const [viewDate, setViewDate] = useState(currentDate);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setViewDate(currentDate);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 20,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(300);
    }
  }, [visible, currentDate]);

  const today = startOfDay(new Date());
  const year = getYear(viewDate);
  const month = getMonth(viewDate);
  const currentYear = getYear(today);

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    subText: isDarkMode ? "#666" : "#999",
    card: isDarkMode ? "#222" : "#f0f0f0",
    border: isDarkMode ? "#333" : "#eee",
    handle: isDarkMode ? "#444" : "#ddd",
  };

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

  const activeBlue = "#0081db";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
        />
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <Pressable
            style={[
              styles.calendarSheet,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: theme.handle }]} />

            {/* Year Navigation */}
            <View style={styles.calNavRow}>
              <TouchableOpacity
                onPress={() => setViewDate(subYears(viewDate, 1))}
              >
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.calNavTitle, { color: theme.text }]}>
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
                  color={isFutureYear ? theme.subText : theme.text}
                />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => {
                const futureMonth = isFutureMonth(i);
                const isSelected = i === month;
                return (
                  <View key={m} style={styles.monthColumn}>
                    <TouchableOpacity
                      onPress={() => {
                        if (futureMonth) return;
                        const newDate = setMonth(viewDate, i);
                        setViewDate(newDate);
                        if (hideDays) {
                          onSelectDate(newDate);
                          handleClose();
                        }
                      }}
                      disabled={futureMonth}
                      style={[
                        styles.monthPill,
                        isSelected && { backgroundColor: activeBlue },
                      ]}
                    >
                      <Text
                        style={{
                          color: futureMonth
                            ? theme.subText
                            : isSelected
                              ? "#fff"
                              : theme.text,
                          fontWeight: "700",
                          fontSize: 13,
                        }}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {!hideDays && (
              <>
                {/* Divider */}
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />

                {/* Day of week headers */}
                <View style={styles.weekDayRow}>
                  {WEEK_DAYS.map((d) => (
                    <View key={d} style={styles.weekDayCell}>
                      <Text
                        style={[styles.weekDayText, { color: theme.subText }]}
                      >
                        {d}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Day Grid */}
                <View style={styles.dayGrid}>
                  {calendarDays.map((day, i) => {
                    const future = isFutureDay(day);
                    const isSelected = isSameDay(day, currentDate);
                    const isToday = isSameDay(day, today);
                    const inMonth = isSameMonth(day, viewDate);
                    return (
                      <View key={i} style={styles.dayColumn}>
                        {inMonth ? (
                          <TouchableOpacity
                            onPress={() => {
                              if (future) return;
                              onSelectDate(day);
                              handleClose();
                            }}
                            disabled={future}
                            style={[
                              styles.dayCell,
                              isSelected && { backgroundColor: activeBlue },
                              !isSelected &&
                                isToday && {
                                  borderWidth: 1.5,
                                  borderColor: activeBlue,
                                },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayNum,
                                {
                                  color: future
                                    ? theme.subText
                                    : isSelected
                                      ? "#fff"
                                      : isToday
                                        ? activeBlue
                                        : theme.text,
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
              </>
            )}

            {/* Done */}
            <TouchableOpacity onPress={handleClose} style={styles.doneBtn}>
              <Text
                style={{ color: activeBlue, fontWeight: "bold", fontSize: 15 }}
              >
                Done
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  divider: { height: 1, marginVertical: 15 },
  weekDayRow: { flexDirection: "row", marginBottom: 6 },
  weekDayCell: { width: "14.28%", alignItems: "center" },
  weekDayText: { fontSize: 11, fontWeight: "700" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayColumn: {
    width: "14.28%",
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNum: { fontSize: 15, fontWeight: "700" },
  doneBtn: { alignItems: "center", marginTop: 14 },
});
