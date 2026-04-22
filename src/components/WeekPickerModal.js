import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  startOfYear,
  format,
  isSameWeek,
  isAfter,
  startOfDay,
} from "date-fns";

export default function WeekPickerModal({ visible, onClose, currentWeek, onSelectWeek, isDarkMode }) {
  const today = startOfDay(new Date());
  const listRef = useRef(null);
  const activeBlue = "#0081db";

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    subText: isDarkMode ? "#666" : "#999",
    card: isDarkMode ? "#222" : "#f0f0f0",
    border: isDarkMode ? "#333" : "#eee",
    handle: isDarkMode ? "#444" : "#ddd",
  };

  const weeks = useMemo(() => {
    const result = [];
    const yearStart = startOfYear(today);
    let weekStart = startOfWeek(yearStart, { weekStartsOn: 1 });
    let weekNum = 1;
    while (!isAfter(weekStart, today)) {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      result.push({ weekNum, start: weekStart, end: weekEnd });
      weekStart = addWeeks(weekStart, 1);
      weekNum++;
    }
    return result.reverse();
  }, []);

  useEffect(() => {
    if (visible && listRef.current) {
      setTimeout(() => listRef.current?.scrollToIndex({ index: 0, animated: false }), 100);
    }
  }, [visible]);

  const handleSelect = (week) => {
    onSelectWeek(week.start);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Pressable
          style={[styles.calendarSheet, { backgroundColor: theme.bg, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.handle }]} />

          {/* Header */}
          <View style={[styles.calNavRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.calNavTitle, { color: theme.text }]}>Select Week</Text>
          </View>

          {/* Week List */}
          <FlatList
            ref={listRef}
            data={weeks}
            keyExtractor={(item) => item.weekNum.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              const isSelected = isSameWeek(item.start, currentWeek, { weekStartsOn: 1 });
              const isCurrent = isSameWeek(item.start, today, { weekStartsOn: 1 });
              return (
                <TouchableOpacity
                  style={[
                    styles.weekRow,
                    { borderBottomColor: theme.border },
                    isSelected && { backgroundColor: activeBlue + "15" },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.weekNum, { color: isSelected ? activeBlue : theme.text }]}>
                        Week {item.weekNum}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: activeBlue + "20" }]}>
                          <Text style={[styles.currentBadgeText, { color: activeBlue }]}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.weekRange, { color: theme.subText }]}>
                      {format(item.start, "MMMM d")} – {format(item.end, "MMMM d, yyyy")}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={activeBlue} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Done */}
          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={{ color: activeBlue, fontWeight: "bold", fontSize: 15 }}>Done</Text>
          </TouchableOpacity>

        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  calendarSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    maxHeight: "65%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  calNavRow: {
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  calNavTitle: { fontSize: 22, fontWeight: "800" },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderRadius: 12,
    marginBottom: 2,
    paddingHorizontal: 12,
  },
  weekNum: { fontSize: 15, fontWeight: "700" },
  weekRange: { fontSize: 12, marginTop: 3 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 10, fontWeight: "700" },
  doneBtn: { alignItems: "center", marginTop: 14 },
});