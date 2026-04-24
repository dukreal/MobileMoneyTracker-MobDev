import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function WeekPickerModal({ visible, onClose, currentWeek, onSelectWeek, isDarkMode }) {
  const insets = useSafeAreaInsets();
  const today = startOfDay(new Date());
  const listRef = useRef(null);
  const activeBlue = "#0081db";
  
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    subText: isDarkMode ? "#666" : "#999",
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
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (week) => {
    onSelectWeek(week.start);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        {/* Background Dimming */}
        <Animated.View 
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: overlayOpacity }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* The Sheet */}
        <Animated.View 
          style={[
            styles.animatedContainer, 
            { transform: [{ translateY: sheetTranslateY }] }
          ]}
        >
          <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={[styles.handle, { backgroundColor: theme.handle }]} />

            <View style={[styles.calNavRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.calNavTitle, { color: theme.text }]}>Select Week</Text>
            </View>

            <FlatList
              ref={listRef}
              data={weeks}
              keyExtractor={(item) => item.weekNum.toString()}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}
              renderItem={({ item }) => {
                const isSelected = isSameWeek(item.start, currentWeek, { weekStartsOn: 1 });
                const isCurrent = isSameWeek(item.start, today, { weekStartsOn: 1 });
                return (
                  <TouchableOpacity
                    style={[styles.weekRow, { borderBottomColor: theme.border }, isSelected && { backgroundColor: activeBlue + "10" }]}
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
                        {format(item.start, "MMM d")} – {format(item.end, "MMM d, yyyy")}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={activeBlue} />}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity 
              onPress={handleClose} 
              style={[
                styles.doneBtn, 
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }
              ]}
            >
              <Text style={{ color: activeBlue, fontWeight: "700", fontSize: 16 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end", // Sticks content to bottom
    margin: 0,
    padding: 0,
  },
  animatedContainer: {
    width: "100%",
    backgroundColor: "transparent",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0, // Force square bottom
    borderBottomRightRadius: 0, // Force square bottom
    paddingHorizontal: 20,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    marginBottom: 0,
  },
  handle: { 
    width: 36, 
    height: 4, 
    borderRadius: 2, 
    alignSelf: "center", 
    marginBottom: 15 
  },
  calNavRow: { 
    alignItems: "center", 
    paddingBottom: 15, 
    borderBottomWidth: 1,
    marginBottom: 5
  },
  calNavTitle: { 
    fontSize: 18, 
    fontWeight: "700" 
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  weekNum: { fontSize: 16, fontWeight: "600" },
  weekRange: { fontSize: 13, marginTop: 2 },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  currentBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  doneBtn: { 
    alignItems: "center", 
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: -20, 
  },
});