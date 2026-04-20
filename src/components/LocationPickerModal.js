import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Keyboard,
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

    const pinIcon = L.divIcon({
      html: \`<div style="
        width: 22px; height: 22px;
        background: #4A90E2;
        border: 3px solid #fff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>\`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      className: '',
    });

    let marker = L.marker([${lat}, ${lng}], { draggable: true, icon: pinIcon }).addTo(map);

    function sendCoords(lat, lng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'coords', lat, lng }));
    }

    sendCoords(${lat}, ${lng});

    marker.on('dragstart', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dragging' }));
    });

    marker.on('dragend', function(e) {
      const pos = e.target.getLatLng();
      sendCoords(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      sendCoords(e.latlng.lat, e.latlng.lng);
    });

    window.moveMarker = function(lat, lng, zoom) {
      const latlng = L.latLng(lat, lng);
      marker.setLatLng(latlng);
      map.flyTo(latlng, zoom || 16, { animate: true, duration: 0.8 });
      sendCoords(lat, lng);
    };
  </script>
</body>
</html>
`;

export default function LocationPickerModal({
  visible,
  onClose,
  onConfirm,
  isDarkMode,
}) {
  const [initialCoords, setInitialCoords] = useState(null);
  const [pinCoords, setPinCoords] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const webviewRef = useRef(null);
  const debounceRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const theme = {
    bg: isDarkMode ? "#121212" : "#fff",
    card: isDarkMode ? "#1E1E1E" : "#f0f0f0",
    card2: isDarkMode ? "#2a2a2a" : "#fff",
    text: isDarkMode ? "#fff" : "#000",
    subText: isDarkMode ? "#aaa" : "#555",
    inputBorder: isDarkMode ? "#333" : "#e0e0e0",
    placeholder: isDarkMode ? "#777" : "#999",
    divider: isDarkMode ? "#333" : "#f0f0f0",
  };

  useEffect(() => {
    if (visible) fetchCurrentLocation();
  }, [visible]);

  const fetchCurrentLocation = async () => {
    setLoadingLocation(true);
    setPlaceName("");
    setSearchText("");
    setSearchResults([]);
    setShowSuggestions(false);
    setPinCoords(null);
    setIsDragging(false);
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Allow location access to tag your entry.",
        );
        onClose();
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setInitialCoords(coords);
      setPinCoords(coords);
      await reverseGeocode(coords.lat, coords.lng);
    } catch {
      const fallback = { lat: 14.5995, lng: 120.9842 };
      setInitialCoords(fallback);
      setPinCoords(fallback);
      await reverseGeocode(fallback.lat, fallback.lng);
    } finally {
      setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    setLoadingPlace(true);
    setPlaceName("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "MobileMoneyTracker/1.0",
          },
        },
      );
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      if (data?.display_name) {
        const addr = data.address || {};
        const placePrimary =
          data.name ||
          addr.amenity ||
          addr.shop ||
          addr.tourism ||
          addr.leisure ||
          addr.building ||
          addr.office ||
          addr.craft ||
          addr.healthcare ||
          addr.historic ||
          addr.hotel ||
          null;
        const placeRoad =
          addr.road || addr.pedestrian || addr.footway || addr.path || null;
        const placeArea =
          addr.suburb ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          addr.city ||
          null;
        let name = "";
        if (placePrimary) {
          // Named place: KFC, G7 Suites, mall, etc.
          name = [placePrimary, placeArea || addr.city || addr.municipality]
            .filter(Boolean)
            .join(", ");
        } else if (placeArea) {
          // No named place, no road — use area + city
          name = [placeArea, addr.city || addr.municipality]
            .filter(Boolean)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", ");
        } else if (placeRoad) {
          // Last resort: road + city
          name = [placeRoad, addr.city || addr.municipality]
            .filter(Boolean)
            .join(", ");
        } else {
          // Absolute fallback: use coords
          name = `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`;
        }
        setPlaceName(name);
      } else {
        setPlaceName("Selected Location");
      }
    } catch {
      setPlaceName("Selected Location");
    } finally {
      setLoadingPlace(false);
    }
  };

  const handleWebViewMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "dragging") {
        setIsDragging(true);
        setPlaceName("");
        return;
      }
      if (msg.type === "coords") {
        setIsDragging(false);
        const coords = { lat: msg.lat, lng: msg.lng };
        setPinCoords(coords);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(
          () => reverseGeocode(coords.lat, coords.lng),
          800,
        );
      }
    } catch {}
  }, []);

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    if (text.trim().length < 3) return;
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(text), 500);
  };

  const fetchSuggestions = async (query) => {
    setSearching(true);
    try {
      const bias = pinCoords
        ? `&viewbox=${pinCoords.lng - 0.15},${pinCoords.lat + 0.15},${pinCoords.lng + 0.15},${pinCoords.lat - 0.15}&bounded=1`
        : "";
      const proximity = pinCoords
        ? `&lat=${pinCoords.lat}&lon=${pinCoords.lng}`
        : "";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&namedetails=1&extratags=1${bias}${proximity}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "MobileMoneyTracker/1.0",
          },
        },
      );
      const data = await res.json();
      // filter out pure roads/highways with no meaningful name
      const filtered = (data || []).filter((item) => {
        if (item.class === "highway" && !item.namedetails?.name) return false;
        return true;
      });
      const sorted = pinCoords
        ? filtered.sort((a, b) => {
            const distA = Math.hypot(
              parseFloat(a.lat) - pinCoords.lat,
              parseFloat(a.lon) - pinCoords.lng,
            );
            const distB = Math.hypot(
              parseFloat(b.lat) - pinCoords.lat,
              parseFloat(b.lon) - pinCoords.lng,
            );
            return distA - distB;
          })
        : filtered;
      setSearchResults(sorted.slice(0, 6));
      setShowSuggestions(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    const coords = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    const addr = item.address || {};
    // Use the actual place name first (e.g. "KFC Banilad"), not the road
    const placePrimary =
      item.namedetails?.name ||
      item.name ||
      addr.amenity ||
      addr.shop ||
      addr.tourism ||
      addr.leisure ||
      addr.building ||
      addr.office ||
      null;
    const placeArea =
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.town ||
      addr.city ||
      null;
    const name = placePrimary
      ? [placePrimary, placeArea || addr.city || addr.municipality]
          .filter(Boolean)
          .join(", ")
      : item.display_name.split(",").slice(0, 2).join(", ");
    setPinCoords(coords);
    setPlaceName(name);
    setSearchText(name);
    setSearchResults([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    webviewRef.current?.injectJavaScript(
      `moveMarker(${coords.lat}, ${coords.lng}, 16); true;`,
    );
  };

  const handleConfirm = () => {
    if (!pinCoords || !placeName) return;
    onConfirm({
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      name: placeName,
    });
    handleClose();
  };

  const handleClose = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setPinCoords(null);
    setPlaceName("");
    setSearchText("");
    setSearchResults([]);
    setShowSuggestions(false);
    setInitialCoords(null);
    setLoadingLocation(true);
    setIsDragging(false);
    onClose();
  };

  const getStatusText = () => {
    if (isDragging) return "Move the pin...";
    if (loadingPlace) return "Finding location...";
    if (placeName) return placeName;
    return "Tap the map or drag the pin";
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.inputBorder }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Pick Location
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search + Suggestions */}
        <View style={{ zIndex: 10 }}>
          <View
            style={[
              styles.searchRow,
              { backgroundColor: theme.card, borderColor: theme.inputBorder },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.placeholder} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search a place..."
              placeholderTextColor={theme.placeholder}
              value={searchText}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color="#4A90E2" />
            ) : searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchText("");
                  setSearchResults([]);
                  setShowSuggestions(false);
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.placeholder}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {showSuggestions && searchResults.length > 0 && (
            <View
              style={[
                styles.suggestionsBox,
                {
                  backgroundColor: theme.card2,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              {searchResults.map((item, index) => {
                const addr = item.address || {};
                const primaryName =
                  addr.amenity ||
                  addr.shop ||
                  addr.tourism ||
                  addr.leisure ||
                  addr.building ||
                  addr.road ||
                  item.display_name.split(",")[0];
                const shortName = primaryName;
                const area =
                  addr.suburb ||
                  addr.neighbourhood ||
                  addr.village ||
                  addr.town ||
                  addr.city ||
                  "";
                const city = addr.city || addr.town || addr.municipality || "";
                const subtitle = [area, city]
                  .filter(Boolean)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(", ");
                return (
                  <TouchableOpacity
                    key={item.place_id}
                    style={[
                      styles.suggestionItem,
                      index < searchResults.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                    onPress={() => handleSelectSuggestion(item)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#4A90E2"
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[styles.suggestionName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {shortName}
                      </Text>
                      {subtitle ? (
                        <Text
                          style={[
                            styles.suggestionSub,
                            { color: theme.subText },
                          ]}
                          numberOfLines={1}
                        >
                          {subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Map */}
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
            onTouchStart={() => {
              if (showSuggestions) {
                setShowSuggestions(false);
                Keyboard.dismiss();
              }
            }}
          />
        )}

        {/* Bottom Bar */}
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: theme.bg, borderTopColor: theme.inputBorder },
          ]}
        >
          <View
            style={[
              styles.locationCard,
              {
                backgroundColor: theme.card,
                borderColor: isDragging ? theme.inputBorder : "#4A90E244",
              },
            ]}
          >
            {loadingPlace ? (
              <ActivityIndicator size="small" color="#4A90E2" />
            ) : (
              <Ionicons
                name={isDragging ? "navigate-outline" : "location"}
                size={18}
                color={isDragging ? theme.placeholder : "#4A90E2"}
              />
            )}
            <Text
              style={[
                styles.placeNameText,
                {
                  color:
                    placeName && !isDragging ? theme.text : theme.placeholder,
                  marginLeft: 10,
                },
              ]}
              numberOfLines={2}
            >
              {getStatusText()}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              {
                opacity:
                  pinCoords && placeName && !loadingPlace && !isDragging
                    ? 1
                    : 0.4,
              },
            ]}
            onPress={handleConfirm}
            disabled={!pinCoords || !placeName || loadingPlace || isDragging}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
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
    paddingTop: Platform.OS === "ios" ? 55 : 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  suggestionsBox: {
    position: "absolute",
    top: 75,
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 10,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestionName: { fontSize: 14, fontWeight: "600" },
  suggestionSub: { fontSize: 12, marginTop: 2 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  bottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderTopWidth: 1,
    gap: 12,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
  },
  placeNameText: { flex: 1, fontSize: 14, fontWeight: "500", lineHeight: 20 },
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
