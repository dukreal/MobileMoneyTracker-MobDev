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

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function YearPickerModal({ visible, onClose, currentYear, onSelectYear, isDarkMode }) {
  const insets = useSafeAreaInsets();
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

  // Generate last 10 years
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    // Starts at the current year and stops exactly at 2021
    for (let year = current; year >= 2021; year--) {
      result.push(year);
    }
    return result;
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View style={[styles.animatedContainer, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={[styles.handle, { backgroundColor: theme.handle }]} />

            <View style={[styles.calNavRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.calNavTitle, { color: theme.text }]}>Select Year</Text>
            </View>

            <FlatList
              data={years}
              keyExtractor={(item) => item.toString()}
              numColumns={3}
              // This ensures equal spacing between the 3 columns
              columnWrapperStyle={{ gap: 10, marginBottom: 12 }}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: SCREEN_HEIGHT * 0.4, marginTop: 10 }}
              renderItem={({ item }) => {
                const isSelected = item === currentYear;
                return (
                  <TouchableOpacity
                    style={[
                      styles.yearGridItem, 
                      { 
                        backgroundColor: isSelected ? activeBlue : (isDarkMode ? "#1e1e1e" : "#f5f5f5"),
                        borderColor: isSelected ? activeBlue : (isDarkMode ? "#333" : "#eee")
                      }
                    ]}
                    onPress={() => {
                      onSelectYear(item);
                      handleClose();
                    }}
                  >
                    <Text style={[
                      styles.yearGridText, 
                      { color: isSelected ? "#fff" : theme.text }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity 
              onPress={handleClose} 
              style={[styles.doneBtn, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}
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
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  animatedContainer: { width: "100%" },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    paddingHorizontal: 20, paddingTop: 12,
    borderWidth: 1, borderBottomWidth: 0,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 15 },
  calNavRow: { alignItems: "center", paddingBottom: 15, borderBottomWidth: 1, marginBottom: 5 },
  calNavTitle: { fontSize: 18, fontWeight: "700" },
  
  // NEW GRID STYLES
  yearGridItem: {
    flex: 1, // Automatically takes up 1/3 of the row
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  yearGridText: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectedYearShadow: {
    shadowColor: "#0081db",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  doneBtn: { 
    alignItems: "center", justifyContent: "center",
    paddingTop: 12, borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)', marginHorizontal: -20, 
  },
});