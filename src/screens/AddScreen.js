import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import LocationPickerModal from "../components/LocationPickerModal";
import { buildTheme, TEXT_SIZE_MULTIPLIER, t } from "../constants/settings";

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { CATEGORIES } from "../constants/Categories";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { initDB, insertLocalTransaction, enqueuePendingOp } from "../db/localDB";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Animated Row ─────────────────────────────────────────────────────────────
function AnimatedRow({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Pressable Row ────────────────────────────────────────────────────────────
function PressableRow({ onPress, children, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, theme }) {
  return <Text style={[styles.sectionLabel, { color: theme.subText }]}>{label}</Text>;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddScreen() {
  const { isDarkMode, user, currency, colorTheme, textSize, language, isOnline, refreshPendingCount } = useStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const amountRef = useRef(null);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [catSheetVisible, setCatSheetVisible] = useState(false);
  const [sheetCat, setSheetCat] = useState(null);
  const [sheetSub, setSheetSub] = useState(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    initDB();
  }, []);

  const openSheet = () => {
    setCatSheetVisible(true);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, damping: 20, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setCatSheetVisible(false);
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(300);
    });
  };

  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [locationOption, setLocationOption] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const theme = {
    ...buildTheme(isDarkMode, colorTheme),
    get card()        { return this.surface; },
    get inputBorder() { return this.border; },
    get placeholder() { return this.subText; },
  };
  const textScale = TEXT_SIZE_MULTIPLIER[textSize] ?? 1.0;

  const handleGetLocation = () => setLocationModalVisible(true);

  const handleUseCurrentLocation = async () => {
    setFetchingLoc(true);
    setLocationOption("current");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to tag your entry.");
        setLocationOption(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const placeName = address[0]
        ? `${address[0].road || address[0].name || ""}, ${address[0].city || ""}`.trim().replace(/^,|,$/, "")
        : "Current Location";
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, name: placeName });
    } catch {
      Alert.alert("Location Error", "Could not fetch your location.");
      setLocationOption(null);
    } finally {
      setFetchingLoc(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3) return Alert.alert("Limit Reached", "Max 3 images.");
    Alert.alert("Add Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") return Alert.alert("Permission Denied", "Allow camera access.");
          let result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.5 });
          if (!result.canceled) setPreviewImage(result.assets[0].uri);
        },
      },
      {
        text: "Photos",
        onPress: async () => {
          let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.5 });
          if (!result.canceled) setPreviewImage(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadImagesToStorage = async (userId) => {
    const uploadedUrls = [];
    for (const uri of images) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${userId}/${fileName}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      const { data } = await supabase.storage
        .from("transaction-images")
        .upload(filePath, decode(base64), { contentType: "image/jpeg" });
      if (data) {
        const { data: urlData } = supabase.storage.from("transaction-images").getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      return Alert.alert("Error", "Please enter a valid amount");
    if (!selectedCat || !selectedSub)
      return Alert.alert("Error", "Please select a category");
    setLoading(true);
    try {
      let userId = user?.id;
      if (!userId) {
        const { data: { session } } = await supabase.auth.getSession();
        userId = session?.user?.id;
      }
      if (!userId) {
        const { data: anonData } = await supabase.auth.signInAnonymously();
        userId = anonData?.user?.id;
      }
      if (!userId) return Alert.alert("Error", "Could not start a session.");
      const payload = {
        user_id: userId,
        amount: parsedAmount,
        type,
        parent_category: selectedCat.name,
        sub_category: selectedSub,
        notes,
        image_urls: [],
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        created_at: new Date().toISOString(),
      };

      await initDB();

      if (isOnline) {
        const imageUrls = await uploadImagesToStorage(userId);
        const { error } = await supabase.from("transactions").insert([{
          ...payload,
          image_urls: imageUrls,
        }]);
        if (error) throw error;
      } else {
        const localId = uuidv4();
        await insertLocalTransaction({ id: localId, ...payload, is_local: true });
        await enqueuePendingOp(localId, "INSERT", { id: localId, ...payload });
        await refreshPendingCount();
      }

      resetFields();
      Alert.alert(
        isOnline ? "Saved!" : "Saved Offline",
        isOnline ? "Transaction added." : "Saved locally. Will sync when back online.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (err) {
      console.log("Save error:", JSON.stringify(err));
      Alert.alert("Save Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFields = useCallback(() => {
    setAmount("");
    setNotes("");
    setSelectedCat(null);
    setSelectedSub(null);
    setImages([]);
    setLocation(null);
    setLoading(false);
    setInputKey((k) => k + 1);
  }, []);

  useFocusEffect(useCallback(() => { resetFields(); }, [resetFields]));

  const expenseColor = "#FF6B6B";
  const incomeColor = "#2ECC71";
  const typeColor = type === "expense" ? expenseColor : incomeColor;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t(language, "addTransaction")}
        </Text>
      </Animated.View>

      {/* ── AMOUNT HERO CARD ── */}
      <AnimatedRow delay={60}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Type Toggle */}
            <View style={[styles.typeToggleRow, { borderBottomColor: theme.border }]}>
              {[
                { key: "expense", label: t(language, "expense"), icon: "arrow-down-circle", color: expenseColor },
                { key: "income",  label: t(language, "income"),  icon: "arrow-up-circle",   color: incomeColor  },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setType(opt.key)}
                  style={[
                    styles.typeBtn,
                    i === 0 && { borderRightWidth: 1, borderRightColor: theme.border },
                    type === opt.key && { backgroundColor: opt.color + "12" },
                  ]}
                >
                  <Ionicons name={opt.icon} size={14} color={type === opt.key ? opt.color : theme.subText} style={{ marginRight: 5 }} />
                  <Text style={[styles.typeBtnText, { color: type === opt.key ? opt.color : theme.subText, fontSize: 13 * textScale }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: typeColor, fontSize: 22 * textScale }]}>{currency}</Text>
              <TextInput
                key={inputKey}
                ref={amountRef}
                style={[styles.amountInput, { color: typeColor, fontSize: 42 * textScale }]}
                textAlign="center"
                placeholder="0.00"
                placeholderTextColor={typeColor + "55"}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                caretHidden={false}
              />
            </View>
          </View>
        </AnimatedRow>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── NOTES ── */}
        <AnimatedRow delay={100}>
          <SectionHeader label={t(language, "notes")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.notesInput, { color: theme.text, fontSize: 15 * textScale }]}
              placeholder={t(language, "notes")}
              placeholderTextColor={theme.placeholder}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </AnimatedRow>

        {/* ── CATEGORY ── */}
        <AnimatedRow delay={140}>
          <SectionHeader label={t(language, "category")} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>

            {/* Selected category bar */}
            {selectedCat ? (
              <PressableRow
                onPress={() => {
                  setSheetCat(selectedCat);
                  setSheetSub(selectedSub);
                  openSheet();
                }}
              >
                <View style={[styles.selectedCatBar, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                  <View style={[styles.selectedCatIcon, { backgroundColor: selectedCat.color + "22" }]}>
                    <Ionicons name={selectedCat.icon} size={20} color={selectedCat.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.selectedCatName, { color: selectedCat.color }]}>{selectedCat.name}</Text>
                    <Text style={[styles.selectedCatSub, { color: theme.placeholder }]}>
                      {selectedSub || "Tap to pick sub-category"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.placeholder} />
                </View>
              </PressableRow>
            ) : (
              <View style={[styles.selectedCatBar, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <View style={[styles.selectedCatIcon, { backgroundColor: theme.surfaceAlt }]}>
                  <Ionicons name="grid-outline" size={20} color={theme.placeholder} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.selectedCatName, { color: theme.placeholder }]}>No category selected</Text>
                  <Text style={[styles.selectedCatSub, { color: theme.placeholder }]}>Please select below</Text>
                </View>
              </View>
            )}

            {/* Category grid */}
            <View style={[styles.catGrid, { padding: 12 }]}>
              {CATEGORIES[type].map((cat) => (
                <TouchableOpacity
                  key={cat.name}
                  style={[
                    styles.catItem,
                    {
                      backgroundColor: selectedCat?.name === cat.name ? cat.color + "22" : theme.surfaceAlt,
                      borderWidth: 2,
                      borderColor: selectedCat?.name === cat.name ? cat.color : "transparent",
                    },
                  ]}
                  onPress={() => {
                    setSheetCat(cat);
                    setSheetSub(selectedCat?.name === cat.name ? selectedSub : null);
                    openSheet();
                  }}
                >
                  <Ionicons name={cat.icon} size={28} color={cat.color} />
                  <Text style={[styles.catText, { color: theme.text }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </AnimatedRow>

        {/* ── LOCATION ── */}
        <AnimatedRow delay={180}>
          <SectionHeader label="Location" theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>

            {/* Option buttons */}
            <View style={[styles.locationBtnRow, { borderBottomWidth: location ? 1 : 0, borderBottomColor: theme.border }]}>
              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                disabled={!isOnline}
                style={[
                  styles.locationOptionBtn,
                  {
                    backgroundColor: locationOption === "current" ? theme.accent + "12" : "transparent",
                    borderRightWidth: 1,
                    borderRightColor: theme.border,
                    opacity: !isOnline ? 0.4 : 1,
                  },
                ]}
              >
                {fetchingLoc ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons name="navigate" size={16} color={locationOption === "current" ? theme.accent : theme.placeholder} />
                )}
                <Text style={[styles.locationOptionText, { color: locationOption === "current" ? theme.accent : theme.text }]}>
                  Current
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setLocationOption("map"); handleGetLocation(); }}
                disabled={!isOnline}
                style={[
                  styles.locationOptionBtn,
                  {
                    backgroundColor: locationOption === "map" ? theme.accent + "12" : "transparent",
                    opacity: !isOnline ? 0.4 : 1,
                  },
                ]}
              >
                <Ionicons name="map" size={16} color={locationOption === "map" ? theme.accent : theme.placeholder} />
                <Text style={[styles.locationOptionText, { color: locationOption === "map" ? theme.accent : theme.text }]}>
                  Pick on Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* Location result */}
            {location && (
              <View style={styles.locationResult}>
                <Ionicons name="location" size={16} color={theme.accent} />
                <Text style={[styles.locationResultText, { color: theme.text }]} numberOfLines={2}>
                  {location.name}
                </Text>
                <TouchableOpacity onPress={() => { setLocation(null); setLocationOption(null); }}>
                  <Ionicons name="close-circle" size={18} color={theme.placeholder} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </AnimatedRow>

        {/* ── PHOTOS ── */}
        <AnimatedRow delay={220}>
          <SectionHeader label={`Photos · ${images.length}/3`} theme={theme} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.imagePreviewRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={{ flex: 1 }}>
                  {images[i] ? (
                    <View>
                      <Image source={{ uri: images[i] }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removeImg} onPress={() => setImages(images.filter((_, idx) => idx !== i))}>
                        <Ionicons name="close-circle" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={pickImage}
                      style={[
                        styles.previewImage,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderWidth: 1.5,
                          borderColor: theme.border,
                          borderStyle: "dashed",
                          justifyContent: "center",
                          alignItems: "center",
                        },
                      ]}
                    >
                      <Ionicons name="add" size={24} color={theme.placeholder} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        </AnimatedRow>

      </ScrollView>

      {/* ── SAVE BUTTON ── */}
      <View style={{ justifyContent: "flex-end", paddingBottom: Math.max(0, insets.bottom - 15) }}> 
      <AnimatedRow delay={260}>
        <PressableRow
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: isDarkMode ? "#fff" : "#000",
              marginHorizontal: 20,
              marginBottom: 0,
              opacity: !amount || !selectedCat || !selectedSub ? 0.4 : 1,
            },
          ]}
        >
          <View style={{ alignItems: "center" }}>
            {loading ? (
              <ActivityIndicator color={isDarkMode ? "#000" : "#fff"} />
            ) : (
              <Text style={[styles.saveBtnText, { color: isDarkMode ? "#000" : "#fff", fontSize: 16 * textScale }]}>
                {t(language, "save")}
              </Text>
            )}
          </View>
        </PressableRow>
      </AnimatedRow>
      </View>

      {/* ── CATEGORY BOTTOM SHEET ── */}
      <Modal visible={catSheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <Animated.View style={[styles.sheetOverlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeSheet} />
          <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
            <View style={[styles.sheetContainer, { backgroundColor: theme.surface, paddingBottom: Math.max(36, insets.bottom + 16) }]}>
              <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]} />

              {sheetCat && (
                <View style={styles.sheetHeader}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: sheetCat.color + "22" }]}>
                    <Ionicons name={sheetCat.icon} size={24} color={sheetCat.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.sheetTitle, { color: theme.text }]}>{sheetCat.name}</Text>
                    <Text style={[styles.sheetSubtitle, { color: theme.placeholder }]}>Select a sub-category</Text>
                  </View>
                </View>
              )}

              <View style={styles.sheetSubGrid}>
                {sheetCat?.subs.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.sheetSubItem,
                      {
                        backgroundColor: sheetSub === sub ? sheetCat.color + "22" : theme.surfaceAlt,
                        borderColor: sheetSub === sub ? sheetCat.color : "transparent",
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setSheetSub(sub)}
                  >
                    <Text style={{ color: sheetSub === sub ? sheetCat.color : theme.text, fontSize: 13, fontWeight: "600" }}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.sheetConfirmBtn, { backgroundColor: theme.accent, opacity: sheetSub ? 1 : 0.4 }]}
                disabled={!sheetSub}
                onPress={() => { setSelectedCat(sheetCat); setSelectedSub(sheetSub); closeSheet(); }}
              >
                <Text style={styles.sheetConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* ── LOCATION PICKER ── */}
      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => { setLocationModalVisible(false); if (!location) setLocationOption(null); }}
        onConfirm={(loc) => { setLocation(loc); setLocationOption("map"); }}
        isDarkMode={isDarkMode}
        colorTheme={colorTheme}
        textSize={textSize}
        language={language}
      />

      {/* ── IMAGE PREVIEW MODAL ── */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" }}>
          <Image source={{ uri: previewImage }} style={{ width: "90%", height: "60%", borderRadius: 16 }} resizeMode="contain" />
          <View style={{ flexDirection: "row", gap: 16, marginTop: 24 }}>
            <TouchableOpacity onPress={() => setPreviewImage(null)} style={{ backgroundColor: "#333", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setImages([...images, previewImage]); setPreviewImage(null); }}
              style={{ backgroundColor: "#fff", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
            >
              <Text style={{ color: "#000", fontWeight: "700", fontSize: 15 }}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header — matches ProfileScreen exactly
  header: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },

  // Section label — matches ProfileScreen exactly
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 4,
    marginBottom: 6,
    marginLeft: 2,
  },

  // Card — matches ProfileScreen exactly
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },

  // ── Amount hero card ──
  typeToggleRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: "800",
    marginRight: 2,
    marginTop: 6,
  },
  amountInput: {
    fontSize: 42,
    fontWeight: "800",
    minWidth: 100,
    textAlign: "center",
  },

  // ── Notes ──
  notesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    textAlignVertical: "center",
  },

  // ── Category ──
  selectedCatBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  selectedCatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedCatName: { fontSize: 14, fontWeight: "700" },
  selectedCatSub: { fontSize: 12, marginTop: 2 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  catItem: {
    width: "31%",
    height: 84,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginBottom: 4,
  },
  catText: { fontSize: 10, marginTop: 4, textAlign: "center" },

  // ── Location ──
  locationBtnRow: {
    flexDirection: "row",
  },
  locationOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    gap: 6,
  },
  locationOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  locationResultText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Photos ──
  imagePreviewRow: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    justifyContent: "space-between",
  },
  previewImage: { width: "100%", aspectRatio: 1, borderRadius: 10 },
  removeImg: { position: "absolute", top: -8, left: -8 },

  // ── Save Button ──
  saveButton: {
    padding: 18,
    borderRadius: 15,
    marginTop: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontWeight: "bold",
    fontSize: 16,
  },

  // ── Bottom Sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sheetIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  sheetSubtitle: { fontSize: 12, marginTop: 2 },
  sheetSubGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  sheetSubItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sheetConfirmBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetConfirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});