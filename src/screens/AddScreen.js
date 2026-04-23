import React, { useState, useCallback, useRef } from "react";
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
} from "react-native";
import LocationPickerModal from "../components/LocationPickerModal";

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy"; // FIXED IMPORT
import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase/supabaseClient";
import { useStore } from "../store/useStore";
import { CATEGORIES } from "../constants/Categories";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

export default function AddScreen({ navigation }) {
  const { isDarkMode, user, currency } = useStore();
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
  const openSheet = () => setCatSheetVisible(true);
  const closeSheet = () => setCatSheetVisible(false);

  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [locationOption, setLocationOption] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    card: isDarkMode ? "#1E1E1E" : "#f9f9f9",
    inputBorder: isDarkMode ? "#333" : "#eee",
    placeholder: isDarkMode ? "#777" : "#999",
  };

  const handleGetLocation = () => {
    setLocationModalVisible(true);
  };

  const handleUseCurrentLocation = async () => {
    setFetchingLoc(true);
    setLocationOption("current");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Allow location access to tag your entry.",
        );
        setLocationOption(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const placeName = address[0]
        ? `${address[0].road || address[0].name || ""}, ${address[0].city || ""}`
            .trim()
            .replace(/^,|,$/, "")
        : "Current Location";
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        name: placeName,
      });
    } catch (e) {
      Alert.alert("Location Error", "Could not fetch your location.");
      setLocationOption(null);
    } finally {
      setFetchingLoc(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3)
      return Alert.alert("Limit Reached", "Max 3 images.");
    Alert.alert("Add Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted")
            return Alert.alert("Permission Denied", "Allow camera access.");
          let result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.5,
          });
          if (!result.canceled) setPreviewImage(result.assets[0].uri);
        },
      },
      {
        text: "Photos",
        onPress: async () => {
          let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: false,
            quality: 0.5,
          });
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
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      const { data, error } = await supabase.storage
        .from("transaction-images")
        .upload(filePath, decode(base64), { contentType: "image/jpeg" });
      if (data) {
        const { data: urlData } = supabase.storage
          .from("transaction-images")
          .getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
    }
    return uploadedUrls;
  };

  const handleSave = async () => {
    if (!amount || !selectedCat || !selectedSub)
      return Alert.alert("Error", "Please fill in all fields");
    setLoading(true);
    try {
      const imageUrls = await uploadImagesToStorage(user.id);
      const { error } = await supabase.from("transactions").insert([
        {
          user_id: user?.id,
          amount: parseFloat(amount),
          type: type,
          parent_category: selectedCat.name,
          sub_category: selectedSub,
          notes: notes,
          image_urls: imageUrls,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
        },
      ]);
      if (error) throw error;
      resetFields();
      navigation.navigate("Home", { selectedDate: new Date().toISOString() });
    } catch (err) {
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

  useFocusEffect(
    useCallback(() => {
      resetFields();
    }, [resetFields]),
  );
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* HERO HEADER */}
      <View
        style={[
          styles.heroSection,
          {
            backgroundColor: theme.bg,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "#2c2c2c" : "#f0f0f0",
          },
        ]}
      >
        <Text style={[styles.heroLabel, { color: theme.text }]}>Add Transaction</Text>

        {/* Type Toggle */}
        <View style={styles.heroToggle}>
          <TouchableOpacity
            style={[
              styles.heroToggleBtn,
              type === "expense" && styles.heroToggleActive,
            ]}
            onPress={() => setType("expense")}
          >
            <Ionicons
              name="arrow-down-circle"
              size={14}
              color={type === "expense" ? "#FF6B6B" : "#999"}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.heroToggleText,
                { color: type === "expense" ? "#FF6B6B" : "#999" },
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.heroToggleBtn,
              type === "income" && styles.heroToggleActive,
            ]}
            onPress={() => setType("income")}
          >
            <Ionicons
              name="arrow-up-circle"
              size={14}
              color={type === "income" ? "#2ECC71" : "#999"}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.heroToggleText,
                { color: type === "income" ? "#2ECC71" : "#999" },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input inside hero */}
        <View style={styles.heroAmountRow}>
          <Text
            style={[
              styles.heroCurrency,
              { color: type === "expense" ? "#FF6B6B" : "#2ECC71" },
            ]}
          >
            {currency}
          </Text>
          <TextInput
            key={inputKey}
            ref={amountRef}
            style={[
              styles.heroAmountInput,
              { color: type === "expense" ? "#FF6B6B" : "#2ECC71" },
            ]}
            textAlign="center"
            placeholder="0.00"
            placeholderTextColor={
              type === "expense" ? "#FF6B6B55" : "#2ECC7155"
            }
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            caretHidden={false}
          />
        </View>
      </View>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
        <TextInput
          style={[
            styles.notesInput,
            { color: theme.text, borderColor: theme.inputBorder },
          ]}
          placeholder="Add a note..."
          placeholderTextColor={theme.placeholder}
          value={notes}
          onChangeText={setNotes}
        />
        <Text style={[styles.label, { color: theme.text }]}>Category</Text>

        {/* Selected category display */}
        {selectedCat && (
          <TouchableOpacity
            style={[
              styles.selectedCatBar,
              {
                backgroundColor: selectedCat.color + "18",
                borderColor: selectedCat.color + "44",
              },
            ]}
            onPress={() => {
              setSheetCat(selectedCat);
              setSheetSub(selectedSub);
              openSheet();
            }}
          >
            <View
              style={[
                styles.selectedCatIcon,
                { backgroundColor: selectedCat.color + "22" },
              ]}
            >
              <Ionicons
                name={selectedCat.icon}
                size={20}
                color={selectedCat.color}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[styles.selectedCatName, { color: selectedCat.color }]}
              >
                {selectedCat.name}
              </Text>
              <Text
                style={[styles.selectedCatSub, { color: theme.placeholder }]}
              >
                {selectedSub || "Tap to pick sub-category"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.placeholder}
            />
          </TouchableOpacity>
        )}

        <View style={styles.catGrid}>
          {CATEGORIES[type].map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.catItem,
                {
                  backgroundColor:
                    selectedCat?.name === cat.name
                      ? cat.color + "22"
                      : theme.card,
                  borderWidth: 2,
                  borderColor:
                    selectedCat?.name === cat.name ? cat.color : "transparent",
                },
              ]}
              onPress={() => {
                setSheetCat(cat);
                setSheetSub(
                  selectedCat?.name === cat.name ? selectedSub : null,
                );
                openSheet();
              }}
            >
              <Ionicons name={cat.icon} size={28} color={cat.color} />
              <Text style={[styles.catText, { color: theme.text }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.section, { borderTopColor: theme.inputBorder }]}>
          <Text style={[styles.label, { color: theme.text, marginBottom: 10 }]}>
            Location{" "}
            <Text
              style={{
                color: theme.placeholder,
                fontWeight: "400",
                fontSize: 12,
              }}
            >
              (optional)
            </Text>
          </Text>

          {/* Option Buttons */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={handleUseCurrentLocation}
              style={[
                styles.locationOptionBtn,
                {
                  backgroundColor:
                    locationOption === "current" ? "#4A90E222" : theme.card,
                  borderColor:
                    locationOption === "current"
                      ? "#4A90E2"
                      : theme.inputBorder,
                  flex: 1,
                },
              ]}
            >
              {fetchingLoc ? (
                <ActivityIndicator size="small" color="#4A90E2" />
              ) : (
                <Ionicons
                  name="navigate"
                  size={16}
                  color={
                    locationOption === "current" ? "#4A90E2" : theme.placeholder
                  }
                />
              )}
              <Text
                style={{
                  color: locationOption === "current" ? "#4A90E2" : theme.text,
                  fontSize: 13,
                  marginLeft: 6,
                  fontWeight: "600",
                }}
              >
                Current
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLocationOption("map");
                handleGetLocation();
              }}
              style={[
                styles.locationOptionBtn,
                {
                  backgroundColor:
                    locationOption === "map" ? "#4A90E222" : theme.card,
                  borderColor:
                    locationOption === "map" ? "#4A90E2" : theme.inputBorder,
                  flex: 1,
                },
              ]}
            >
              <Ionicons
                name="map"
                size={16}
                color={locationOption === "map" ? "#4A90E2" : theme.placeholder}
              />
              <Text
                style={{
                  color: locationOption === "map" ? "#4A90E2" : theme.text,
                  fontSize: 13,
                  marginLeft: 6,
                  fontWeight: "600",
                }}
              >
                Pick on Map
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Result */}
          {location && (
            <View
              style={[
                styles.locationResult,
                { backgroundColor: theme.card, borderColor: "#4A90E244" },
              ]}
            >
              <Ionicons name="location" size={16} color="#4A90E2" />
              <Text
                style={{
                  color: theme.text,
                  fontSize: 13,
                  flex: 1,
                  marginLeft: 6,
                }}
                numberOfLines={2}
              >
                {location.name}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLocation(null);
                  setLocationOption(null);
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.placeholder}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Photos */}
        <View style={{ marginTop: 0 }}>
          <Text
            style={{
              color: theme.placeholder,
              fontSize: 12,
              marginTop: 6,
              marginBottom: -6,
            }}
          >
            {images.length}/3 Photos (optional)
          </Text>
          <View style={styles.imagePreviewRow}>
            {[0, 1, 2].map((i) => (
              <View key={i}>
                {images[i] ? (
                  <View>
                    <Image
                      source={{ uri: images[i] }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImg}
                      onPress={() =>
                        setImages(images.filter((_, idx) => idx !== i))
                      }
                    >
                      <Ionicons name="close-circle" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    style={[
                      styles.previewImage,
                      {
                        backgroundColor: isDarkMode ? "#2a2a2a" : "#f0f0f0",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isDarkMode ? "#333" : "#ddd",
                        borderStyle: "dashed",
                      },
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={24}
                      color={isDarkMode ? "#555" : "#ccc"}
                    />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={[
          styles.saveButton,
          {
            backgroundColor: isDarkMode ? "#fff" : "#000",
            opacity: !amount || !selectedCat || !selectedSub ? 0.4 : 1,
          },
        ]}
        onPress={handleSave}
        disabled={loading || !amount || !selectedCat || !selectedSub}
      >
        {loading ? (
          <ActivityIndicator color={isDarkMode ? "#000" : "#fff"} />
        ) : (
          <Text
            style={{ color: isDarkMode ? "#000" : "#fff", fontWeight: "bold" }}
          >
            Save Transaction
          </Text>
        )}
      </TouchableOpacity>

      {/* CATEGORY BOTTOM SHEET */}
      <Modal
        visible={catSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={closeSheet}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.sheetContainer, { backgroundColor: theme.bg }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: isDarkMode ? "#444" : "#ddd" }]} />

            {/* Sheet Header */}
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

            {/* Sub-category grid */}
            <View style={styles.sheetSubGrid}>
              {sheetCat?.subs.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.sheetSubItem,
                    {
                      backgroundColor: sheetSub === sub ? sheetCat.color + "22" : theme.card,
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

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.sheetConfirmBtn, { opacity: sheetSub ? 1 : 0.4 }]}
              disabled={!sheetSub}
              onPress={() => {
                setSelectedCat(sheetCat);
                setSelectedSub(sheetSub);
                closeSheet();
              }}
            >
              <Text style={styles.sheetConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => {
          setLocationModalVisible(false);
          if (!location) setLocationOption(null);
        }}
        onConfirm={(loc) => {
          setLocation(loc);
          setLocationOption("map");
        }}
        isDarkMode={isDarkMode}
      />

      <Modal visible={!!previewImage} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            source={{ uri: previewImage }}
            style={{ width: "90%", height: "60%", borderRadius: 16 }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: "row", gap: 16, marginTop: 24 }}>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={{
                backgroundColor: "#333",
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Retake
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setImages([...images, previewImage]);
                setPreviewImage(null);
              }}
              style={{
                backgroundColor: "#fff",
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: "#000", fontWeight: "700", fontSize: 15 }}>
                Use Photo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 5, paddingBottom: 40 },
  segmentWrapper: {
    flexDirection: "row",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 4,
    position: "relative",
    height: 46,
  },
  segmentSlider: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "49%",
    borderRadius: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  segmentText: { fontSize: 14, fontWeight: "700" },
  locationOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  locationResult: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  heroSection: {
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 4.5,
  },
  heroLabel: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  heroToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  heroToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 9,
  },
  heroToggleActive: { backgroundColor: "#fff" },
  heroToggleText: { fontSize: 13, fontWeight: "700" },
  heroAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heroCurrency: {
    fontSize: 22,
    fontWeight: "800",
    marginRight: 2,
    marginTop: 6,
  },
  heroAmountInput: {
    fontSize: 42,
    fontWeight: "800",
    minWidth: 100,
    textAlign: "center",
  },
  amountInput: {
    fontSize: 44,
    textAlign: "center",
    marginVertical: 5,
    fontWeight: "bold",
    textAlignVertical: "center",
  },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
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
  subGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
    marginTop: 4,
    gap: 8,
  },
  subItem: { padding: 8, paddingHorizontal: 14, borderRadius: 15 },
  activeSub: { backgroundColor: "#4A90E2" },
  section: { marginTop: 10, paddingTop: 15, borderTopWidth: 1 },
  selectedCatBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
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
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  sheetConfirmText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  utilRow: { flexDirection: "row" },
  utilBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  imagePreviewRow: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
    paddingBottom: 15,
  },
  previewImage: { width: 70, height: 70, borderRadius: 10 },
  removeImg: { position: "absolute", top: -5, right: -5 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
    fontSize: 15,
  },
  saveButton: {
    padding: 18,
    borderRadius: 15,
    marginHorizontal: 20,
    marginVertical: 15,
    alignItems: "center",
  },
});
