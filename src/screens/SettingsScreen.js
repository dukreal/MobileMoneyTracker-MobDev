import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { buildTheme, TEXT_SIZE_MULTIPLIER, t } from "../constants/settings";

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
function PressableRow({ onPress, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, theme, sz = 1 }) {
  return <Text style={[styles.sectionLabel, { color: theme.subText, fontSize: 11 * sz }]}>{label}</Text>;
}

// ─── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({ icon, iconBg, iconColor, label, subLabel, right, borderBottom, theme, sz = 1 }) {
  return (
    <View style={[styles.settingRow, borderBottom && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={17} color={iconColor} />
        </View>
        <View>
          <Text style={[styles.settingText, { color: theme.text, fontSize: 14 * sz }]}>{label}</Text>
          {subLabel && <Text style={[styles.settingSubText, { color: theme.subText, fontSize: 11 * sz }]}>{subLabel}</Text>}
        </View>
      </View>
      <View>{right}</View>
    </View>
  );
}

// ─── Color Theme Data ─────────────────────────────────────────────────────────
const COLOR_THEMES = [
  { key: "green",  label: "Green",     color: "#27AE60" },
  { key: "blue",   label: "Blue",      color: "#3B7DD8" },
  { key: "orange", label: "Orange",    color: "#E67E22" },
  { key: "rose",   label: "Rose",      color: "#E05282" },
];

const TEXT_SIZES = [
  { key: "small",  label: "S" },
  { key: "medium", label: "M" },
  { key: "large",  label: "L" },
];

const LANGUAGES = [
  { key: "english",  label: "English",  flag: "🇺🇸" },
  { key: "filipino", label: "Filipino", flag: "🇵🇭" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const {
    isDarkMode,
    toggleDarkMode,
    colorTheme,
    setColorTheme,
    textSize,
    setTextSize,
    language,
    setLanguage,
    advancedMode,
    toggleAdvancedMode,
  } = useStore();

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const accentColor = COLOR_THEMES.find(t => t.key === colorTheme)?.color ?? "#3B7DD8";
  const sz = TEXT_SIZE_MULTIPLIER[textSize] ?? 1.0;

  const theme = buildTheme(isDarkMode, colorTheme);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* ── HEADER ── */}
      <Animated.View
        style={[
          styles.header,
          { borderBottomColor: theme.border },
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: 18 * sz }]}>{t(language, "settings")}</Text>
        <View style={{ width: 36 }} />
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── APPEARANCE ── */}
        <AnimatedRow delay={60}>
          <SectionHeader label={t(language, "appearance")} theme={theme} sz={sz} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>

            {/* Dark / Light Mode */}
            <SettingRow
              icon={isDarkMode ? "moon" : "sunny"}
              iconBg={isDarkMode ? "#7C3AED15" : "#F39C1215"}
              iconColor={isDarkMode ? "#7C3AED" : "#F39C12"}
              label={t(language, "themeMode")}
              subLabel={isDarkMode ? t(language, "dark") : t(language, "light")}
              theme={theme}
              sz={sz}
              borderBottom
              right={
                <TouchableOpacity
                  onPress={toggleDarkMode}
                  style={[styles.modeToggle, { backgroundColor: theme.surfaceAlt }]}
                >
                  <View style={[styles.modeOption, isDarkMode && { backgroundColor: theme.surface }]}>
                    <Ionicons name="sunny" size={13} color={!isDarkMode ? theme.accent : theme.subText} />
                  </View>
                  <View style={[styles.modeOption, !isDarkMode && { backgroundColor: theme.surface }]}>
                    <Ionicons name="moon" size={13} color={isDarkMode ? theme.accent : theme.subText} />
                  </View>
                </TouchableOpacity>
              }
            />

            {/* Color Theme */}
            <SettingRow
              icon="color-palette-outline"
              iconBg={accentColor + "15"}
              iconColor={accentColor}
              label={t(language, "colorTheme")}
              theme={theme}
              sz={sz}
              borderBottom
              right={
                <View style={styles.colorRow}>
                  {COLOR_THEMES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setColorTheme(t.key)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: t.color },
                        colorTheme === t.key && styles.colorDotSelected,
                      ]}
                    >
                      {colorTheme === t.key && (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />

            {/* Text Size */}
            <SettingRow
              icon="text-outline"
              iconBg="#5AC8FA15"
              iconColor="#5AC8FA"
              label={t(language, "textSize")}
              subLabel={textSize.charAt(0).toUpperCase() + textSize.slice(1)}
              theme={theme}
              sz={sz}
              right={
                <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]}>
                  {TEXT_SIZES.map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setTextSize(s.key)}
                      style={[
                        styles.segBtn,
                        textSize === s.key && { backgroundColor: theme.surface, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
                      ]}
                    >
                      <Text style={[styles.segBtnText, { color: textSize === s.key ? theme.accent : theme.subText }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
          </View>
        </AnimatedRow>

        {/* ── ADVANCED ── */}
        <AnimatedRow delay={100}>
          <SectionHeader label="Advanced" theme={theme} sz={sz} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SettingRow
              icon="calendar-outline"
              iconBg="#5AC8FA15"
              iconColor="#5AC8FA"
              label="Advanced Mode"
              subLabel="Choose custom date when adding"
              theme={theme}
              sz={sz}
              right={
                <TouchableOpacity
                  onPress={toggleAdvancedMode}
                  style={[
                    styles.switchTrack,
                    { backgroundColor: advancedMode ? theme.accent : (isDarkMode ? "#3a3a3a" : "#d1d1d6") },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.switchThumb,
                      { transform: [{ translateX: advancedMode ? 22 : 2 }] },
                    ]}
                  />
                </TouchableOpacity>
              }
            />
          </View>
        </AnimatedRow>

        {/* ── LANGUAGE ── */}
        <AnimatedRow delay={120}>
          <SectionHeader label={t(language, "language")} theme={theme} sz={sz} />
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {LANGUAGES.map((lang, i) => (
              <PressableRow key={lang.key} onPress={() => setLanguage(lang.key)}>
                <View style={[
                  styles.settingRow,
                  i < LANGUAGES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}>
                      <Text style={{ fontSize: 16 }}>{lang.flag}</Text>
                    </View>
                    <Text style={[styles.settingText, { color: theme.text, fontSize: 14 * sz }]}>{lang.label}</Text>
                  </View>
                  {language === lang.key && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
                  )}
                </View>
              </PressableRow>
            ))}
          </View>
        </AnimatedRow>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  settingText: { fontSize: 14, fontWeight: "600" },
  settingSubText: { fontSize: 11, fontWeight: "500", marginTop: 1 },

  // Mode toggle
  modeToggle: { flexDirection: "row", padding: 3, borderRadius: 10, gap: 2 },
  modeOption: { width: 30, height: 26, borderRadius: 7, justifyContent: "center", alignItems: "center" },

  // Color dots
  colorRow: { flexDirection: "row", gap: 8 },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Segmented
  segmented: { flexDirection: "row", padding: 3, borderRadius: 10, gap: 2 },
  segBtn: { width: 34, height: 28, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  segBtnText: { fontSize: 13, fontWeight: "800" },

  // Switch
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
});