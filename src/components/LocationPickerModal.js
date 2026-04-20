import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";

const MAP_HTML = (lat, lng) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: \`<div style="
        width: 28px; height: 28px;
        background: #4A90E2;
        border: 3px solid #fff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>\`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: '',
    });

    let marker = L.marker([${lat}, ${lng}], { draggable: true, icon }).addTo(map);

    function sendCoords(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
    }

    sendCoords(${lat}, ${lng});

    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      sendCoords(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      sendCoords(e.latlng.lat, e.latlng.lng);
    });

    window.moveMarker = function(lat, lng) {
      const latlng = L.latLng(lat, lng);
      marker.setLatLng(latlng);
      map.flyTo(latlng, 16, { animate: true, duration: 0.8 });
      sendCoords(lat, lng);
    };
  </script>
</body>
</html>
`;

export default function LocationPickerModal({ visible, onClose, onConfirm, isDarkMode }) {
  const [initialCoords, setInitialCoords] = useState(null);
  const [pinCoords, setPinCoords] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [searching, setSearching] = useState(false);
  const webviewRef = useRef(null);
  const debounceRef = useRef(null);

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    card: isDarkMode ? "#1E1E1E" : "#f0f0f0",
    text: isDarkMode ? "#fff" : "#000",
    inputBorder: isDarkMode ? "#333" : "#e0e0e0",
    placeholder: isDarkMode ? "#777" : "#999",
    subText: isDarkMode ? "#888" : "#666",
  };

  useEffect(() => {
    if (visible) {
      fetchCurrentLocation();
    }
  }, [visible]);

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    setPlaceName("");
    setSearchText("");
    setPinCoords(null);
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Allow location access to tag your entry.");
        onClose();
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setInitialCoords(coords);
      setPinCoords(coords);
      await reverseGeocode(coords.lat, coords.lng);
    } catch (e) {
      // fallback to Manila if location fails
      const fallback = { lat: 14.5995, lng: 120.9842 };
      setInitialCoords(fallback);
      setPinCoords(fallback);
      setPlaceName("Manila, Philippines");
    } finally {
      setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    setLoadingPlace(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const name =
        data.address?.road
          ? `${data.address.road}${data.address.city ? ", " + data.address.city : ""}`
          : data.display_name?.split(",").slice(0, 2).join(", ") || "Selected Location";
      setPlaceName(name);
    } catch {
      setPlaceName("Selected Location");
    } finally {
      setLoadingPlace(false);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const { lat, lng } = JSON.parse(event.nativeEvent.data);
      setPinCoords({ lat, lng });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reverseGeocode(lat, lng);
      }, 600);
    } catch {}
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!data || data.length === 0) {
        Alert.alert("Not Found", "Could not find that location. Try a different name.");
        return;
      }
      const { lat, lon, display_name } = data[0];
      const coords = { lat: parseFloat(lat), lng: parseFloat(lon) };
      setPinCoords(coords);
      const shortName = display_name.split(",").slice(0, 2).join(", ");
      setPlaceName(shortName);
      webviewRef.current?.injectJavaScript(`moveMarker(${coords.lat}, ${coords.lng}); true;`);
    } catch {
      Alert.alert("Search Error", "Could not search for that location.");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!pinCoords) return;
    onConfirm({
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      name: placeName || "Selected Location",
    });
    handleClose();
  };

  const handleClose = () => {
    setPinCoords(null);
    setPlaceName("");
    setSearchText("");
    setInitialCoords(null);
    setLoadingLocation(true);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Pick Location</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.inputBorder }]}>
            <Ionicons name="search" size={18} color={theme.placeholder} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search a place..."
              placeholderTextColor={theme.placeholder}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color="#4A90E2" />
            ) : searchText.length > 0 ? (
              <TouchableOpacity onPress={handleSearch}>
                <Ionicons name="arrow-forward-circle" size={22} color="#4A90E2" />
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>

        {/* Map or Loader */}
        {loadingLocation || !initialCoords ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={[styles.loadingText, { color: theme.subText }]}>
              Fetching your location...
            </Text>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            style={styles.map}
            source={{ html: MAP_HTML(initialCoords.lat, initialCoords.lng) }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            scrollEnabled={false}
          />
        )}

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.bg, borderTopColor: theme.inputBorder }]}>
          <View style={styles.placeNameRow}>
            <Ionicons name="location" size={16} color="#4A90E2" style={{ marginTop: 1 }} />
            {loadingPlace ? (
              <ActivityIndicator size="small" color="#4A90E2" style={{ marginLeft: 8 }} />
            ) : (
              <Text style={[styles.placeNameText, { color: theme.text }]} numberOfLines={2}>
                {placeName || "Tap or drag the pin to select a location"}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { opacity: pinCoords && placeName && !loadingPlace ? 1 : 0.4 },
            ]}
            onPress={handleConfirm}
            disabled={!pinCoords || !placeName || loadingPlace}
          >
            <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  bottomBar: {
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 1,
    gap: 12,
  },
  placeNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: 20,
  },
  placeNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  confirmBtn: {
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});