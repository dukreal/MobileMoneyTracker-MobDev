import React, { useState, useCallback } from "react";
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
} from "react-native";
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
  const { isDarkMode, user } = useStore();
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    card: isDarkMode ? "#1E1E1E" : "#f9f9f9",
    inputBorder: isDarkMode ? "#333" : "#eee",
    placeholder: isDarkMode ? "#777" : "#999",
  };

  const handleGetLocation = async () => {
    setFetchingLoc(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Allow location access to tag your entry.",
        );
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      let address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const placeName = address[0]
        ? `${address[0].name || address[0].street}, ${address[0].city}`
        : "Current Location";
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        name: placeName,
      });
    } catch (e) {
      Alert.alert("Location Error", "Could not fetch location.");
    } finally {
      setFetchingLoc(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3)
      return Alert.alert("Limit Reached", "Max 3 images.");
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], // FIXED MEDIA TYPES
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
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
      Alert.alert("Success", "Record added!");
      resetFields();

      navigation.navigate("Home");
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetFields();
    }, [resetFields]),
  );
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.toggle, type === "expense" && styles.activeExpense]}
          onPress={() => setType("expense")}
        >
          <Text style={{ color: type === "expense" ? "#fff" : theme.text }}>
            Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, type === "income" && styles.activeIncome]}
          onPress={() => setType("income")}
        >
          <Text style={{ color: type === "income" ? "#fff" : theme.text }}>
            Income
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={[styles.amountInput, { color: theme.text }]}
        placeholder="0.00"
        placeholderTextColor={theme.placeholder}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
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
              { backgroundColor: theme.card },
              selectedCat?.name === cat.name && {
                borderColor: cat.color,
                borderWidth: 2,
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
            style={[styles.utilBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons
              name="location"
              size={18}
              color={location ? "#4A90E2" : theme.placeholder}
            />
            <Text style={{ color: theme.text, marginLeft: 5, fontSize: 12 }}>
              {fetchingLoc ? "..." : location ? "Tagged" : "Location"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pickImage}
            style={[styles.utilBtn, { backgroundColor: theme.card }]}
          >
            <Ionicons
              name="camera"
              size={18}
              color={images.length > 0 ? "#4A90E2" : theme.placeholder}
            />
            <Text style={{ color: theme.text, marginLeft: 5, fontSize: 12 }}>
              {images.length}/3 Photos
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.imagePreviewRow}>
          {images.map((uri, i) => (
            <View key={i}>
              <Image source={{ uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImg}
                onPress={() => setImages(images.filter((_, idx) => idx !== i))}
              >
                <Ionicons name="close-circle" size={20} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: isDarkMode ? "#fff" : "#000" },
        ]}
        onPress={handleSave}
        disabled={loading}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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
    backgroundColor: "#f0f0f0",
    marginHorizontal: 5,
  },
  activeExpense: { backgroundColor: "#FF6B6B" },
  activeIncome: { backgroundColor: "#2ECC71" },
  amountInput: {
    fontSize: 44,
    textAlign: "center",
    marginVertical: 15,
    fontWeight: "bold",
  },
  label: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  catItem: {
    width: "31%",
    padding: 10,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 10,
  },
  catText: { fontSize: 10, marginTop: 4, textAlign: "center" },
  subGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20 },
  subItem: { padding: 8, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  activeSub: { backgroundColor: "#4A90E2" },
  section: { marginTop: 10, paddingTop: 15, borderTopWidth: 1 },
  utilRow: { flexDirection: "row", justifyContent: "space-between" },
  utilBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    flex: 0.48,
  },
  imagePreviewRow: { flexDirection: "row", marginTop: 15, gap: 10 },
  previewImage: { width: 70, height: 70, borderRadius: 10 },
  removeImg: { position: "absolute", top: -5, right: -5 },
  notesInput: {
    borderBottomWidth: 1,
    padding: 12,
    marginTop: 15,
    fontSize: 16,
  },
  saveButton: {
    padding: 18,
    borderRadius: 15,
    marginTop: 25,
    alignItems: "center",
    marginBottom: 60,
  },
});
