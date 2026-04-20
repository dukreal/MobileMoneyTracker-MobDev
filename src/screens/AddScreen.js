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

  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);
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
      <View style={{ alignItems: "center", paddingTop: 60, paddingBottom: 10 }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "900",
            letterSpacing: 0.5,
            color: theme.text,
          }}
        >
          Add
        </Text>
      </View>
      <View style={[styles.segmentWrapper, { backgroundColor: theme.card }]}>
        <View
          style={[
            styles.segmentSlider,
            {
              backgroundColor: type === "expense" ? "#FF6B6B" : "#2ECC71",
              left: type === "expense" ? 4 : "50%",
            },
          ]}
        />
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => setType("expense")}
        >
          <Ionicons
            name="arrow-down-circle"
            size={15}
            color={type === "expense" ? "#fff" : theme.placeholder}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: type === "expense" ? "#fff" : theme.placeholder },
            ]}
          >
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => setType("income")}
        >
          <Ionicons
            name="arrow-up-circle"
            size={15}
            color={type === "income" ? "#fff" : theme.placeholder}
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.segmentText,
              { color: type === "income" ? "#fff" : theme.placeholder },
            ]}
          >
            Income
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: type === "expense" ? "#FF6B6B18" : "#2ECC7118",
              borderColor: type === "expense" ? "#FF6B6B44" : "#2ECC7144",
            },
          ]}
        >
          <Text
            style={[
              styles.currencySymbol,
              { color: type === "expense" ? "#FF6B6B" : "#2ECC71" },
            ]}
          >
            {currency}
          </Text>
          <TextInput
            key={inputKey}
            ref={amountRef}
            style={[
              styles.amountInput,
              { color: type === "expense" ? "#FF6B6B" : "#2ECC71" },
            ]}
            textAlign="center"
            placeholder="0.00"
            placeholderTextColor={
              type === "expense" ? "#FF6B6B88" : "#2ECC7188"
            }
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            caretHidden={false}
            onFocus={() => {
              if (amountRef.current) {
                amountRef.current.setNativeProps({
                  selection: { start: amount.length, end: amount.length },
                });
              }
            }}
          />
        </View>
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
        <View style={styles.catGrid}>
          {CATEGORIES[type].map((cat) => (
            <TouchableOpacity
              key={cat.name}
              onPress={() => {
                setSelectedCat(cat);
                setSelectedSub(null);
              }}
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
            >
              <Ionicons name={cat.icon} size={22} color={cat.color} />
              <Text style={[styles.catText, { color: theme.text }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedCat && (
          <View style={styles.subGrid}>
            {selectedCat.subs.map((sub) => (
              <TouchableOpacity
                key={sub}
                onPress={() => setSelectedSub(sub)}
                style={[
                  styles.subItem,
                  { backgroundColor: isDarkMode ? "#333" : "#eee" },
                  selectedSub === sub && styles.activeSub,
                ]}
              >
                <Text
                  style={{ color: selectedSub === sub ? "#fff" : theme.text }}
                >
                  {sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={[styles.section, { borderTopColor: theme.inputBorder }]}>
          <View style={styles.utilRow}>
            <TouchableOpacity
              onPress={handleGetLocation}
              style={[
                styles.utilBtn,
                {
                  backgroundColor: theme.card,
                  flex: 1,
                  justifyContent: "space-between",
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="location"
                  size={18}
                  color={location ? "#4A90E2" : theme.placeholder}
                />
                <Text
                  style={{ color: theme.text, marginLeft: 5, fontSize: 12 }}
                  numberOfLines={1}
                >
                  {location ? location.name : "Tag Location"}
                </Text>
              </View>
              {location && (
                <TouchableOpacity onPress={() => setLocation(null)}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={theme.placeholder}
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.locationManualInput,
              {
                color: theme.text,
                borderColor: theme.inputBorder,
                backgroundColor: theme.card,
              },
            ]}
            placeholder="Or type a location name..."
            placeholderTextColor={theme.placeholder}
            value={location?.name && !fetchingLoc ? location.name : ""}
            onChangeText={(text) =>
              setLocation(
                text ? { latitude: null, longitude: null, name: text } : null,
              )
            }
          />
          <Text
            style={{
              color: theme.placeholder,
              fontSize: 12,
              marginTop: 12,
              marginBottom: 6,
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

      <LocationPickerModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onConfirm={(loc) => setLocation(loc)}
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
  amountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "bold",
    marginRight: 4,
  },
  locationManualInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  toggle: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeExpense: { backgroundColor: "#FF6B6B" },
  activeIncome: { backgroundColor: "#2ECC71" },
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
    width: "30%",
    height: 80,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
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
    marginTop: 15,
    marginBottom: 15,
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
