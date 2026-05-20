import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Pressable,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { buildTheme, TEXT_SIZE_MULTIPLIER, t } from "../constants/settings";

// ─── Animated Row ─────────────────────────────────────────────────────────────
function AnimatedRow({ children, delay = 0, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FAQItem({ question, answer, theme, isLast, sz = 1 }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(anim, { toValue, useNativeDriver: false, tension: 60, friction: 10 }),
      Animated.spring(rotate, { toValue, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start();
    setOpen(!open);
  };

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
  const rotateZ = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <Pressable
      onPress={toggle}
      style={[
        styles.faqItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: theme.text, fontSize: 14 * sz }]}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateZ }] }}>
          <Ionicons name="add" size={18} color={theme.subText} />
        </Animated.View>
      </View>
      <Animated.View style={{ maxHeight, overflow: "hidden" }}>
        <Text style={[styles.faqAnswer, { color: theme.subText, fontSize: 13 * sz }]}>{answer}</Text>
      </Animated.View>
    </Pressable>
  );
}

const getFAQData = (language) => [
  { question: t(language, "faq1Q"), answer: t(language, "faq1A") },
  { question: t(language, "faq2Q"), answer: t(language, "faq2A") },
  { question: t(language, "faq3Q"), answer: t(language, "faq3A") },
  { question: t(language, "faq4Q"), answer: t(language, "faq4A") },
  { question: t(language, "faq5Q"), answer: t(language, "faq5A") },
  { question: t(language, "faq6Q"), answer: t(language, "faq6A") },
  { question: t(language, "faq7Q"), answer: t(language, "faq7A") },
  { question: t(language, "faq8Q"), answer: t(language, "faq8A") },
  { question: t(language, "faq9Q"), answer: t(language, "faq9A") },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HelpSupportScreen({ navigation }) {
  const { isDarkMode, colorTheme, textSize, language, session } = useStore();
  const sz = TEXT_SIZE_MULTIPLIER[textSize] ?? 1.0;
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const theme = buildTheme(isDarkMode, colorTheme);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert(t(language, "missingInfo"), t(language, "missingInfoMsg"));
      return;
    }

    Animated.sequence([
      Animated.spring(sendBtnScale, { toValue: 0.95, useNativeDriver: true, speed: 40 }),
      Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();

    setSending(true);

    const email = "dakdekdikdokduk123@gmail.com";
    const encodedSubject = encodeURIComponent(subject);
    const userInfo = session?.user?.email ? `\n\n---\nUser: ${session.user.email}` : "\n\n---\nUser: Guest";
    const encodedBody = encodeURIComponent(message + userInfo);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
        setSubject("");
        setMessage("");
      } else {
        Alert.alert(t(language, "noEmailApp"), t(language, "noEmailAppMsg"));
      }
    } catch (e) {
      Alert.alert("Error", t(language, "errorGeneric"));
    } finally {
      setSending(false);
    }
  };

  const inputStyle = (field) => [
    styles.input,
    {
      backgroundColor: theme.surfaceAlt,
      color: theme.text,
      borderColor: focusedField === field ? theme.accent : "transparent",
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior="height"
      keyboardVerticalOffset={0}
    >
      {/* ── HEADER ── */}
      <AnimatedRow delay={0}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: 17 * sz }]}>{t(language, "helpSupportTitle")}</Text>
          <View style={{ width: 36 }} />
        </View>
      </AnimatedRow>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO BANNER ── */}
        <AnimatedRow delay={60}>
          <View style={[styles.heroBanner, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "20" }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name="headset-outline" size={28} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: theme.text, fontSize: 15 * sz }]}>{t(language, "hereToHelp")}</Text>
              <Text style={[styles.heroSub, { color: theme.subText, fontSize: 12 * sz }]}>
                {t(language, "heroSub")}
              </Text>
            </View>
          </View>
        </AnimatedRow>

        {/* ── FAQ ── */}
        <AnimatedRow delay={120}>
          <Text style={[styles.sectionLabel, { color: theme.subText, fontSize: 11 * sz }]}>{t(language, "frequentlyAsked")}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {getFAQData(language).map((item, i) => (
              <FAQItem
                key={i}
                question={item.question}
                answer={item.answer}
                theme={theme}
                isLast={i === getFAQData(language).length - 1}
                sz={sz}
              />
            ))}
          </View>
        </AnimatedRow>

        {/* ── CONTACT FORM ── */}
        <AnimatedRow delay={200}>
          <Text style={[styles.sectionLabel, { color: theme.subText, fontSize: 11 * sz }]}>{t(language, "contactUs")}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16, gap: 10 }]}>
            <Text style={[styles.formNote, { color: theme.subText, fontSize: 12 * sz }]}>
              {t(language, "formNote")}{" "}
              <Text style={{ color: theme.accent }}>dakdekdikdokduk123@gmail.com</Text>
            </Text>

            <TextInput
              style={[inputStyle("subject"), { fontSize: 14 * sz }]}
              placeholder={t(language, "subjectPlaceholder")}
              placeholderTextColor={theme.subText}
              value={subject}
              onChangeText={setSubject}
              onFocus={() => setFocusedField("subject")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
            />

            <TextInput
              style={[inputStyle("message"), styles.textarea, { fontSize: 14 * sz }]}
              placeholder={t(language, "messagePlaceholder")}
              placeholderTextColor={theme.subText}
              value={message}
              onChangeText={setMessage}
              onFocus={() => setFocusedField("message")}
              onBlur={() => setFocusedField(null)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: sending ? 0.7 : 1 }]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.9}
              >
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={[styles.sendBtnText, { fontSize: 14 * sz }]}>{sending ? t(language, "openingMail") : t(language, "sendMessage")}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </AnimatedRow>

        {/* ── ABOUT THE APP ── */}
        <AnimatedRow delay={280}>
          <Text style={[styles.sectionLabel, { color: theme.subText, fontSize: 11 * sz }]}>{t(language, "about")}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { label: t(language, "aboutAppName"), value: "Montra", icon: "phone-portrait-outline", iconBg: theme.accent + "15", iconColor: theme.accent },
              { label: t(language, "aboutVersion"), value: "1.0.0", icon: "code-slash-outline", iconBg: "#7C3AED15", iconColor: "#7C3AED" },
              { label: t(language, "aboutDeveloper"), value: "dukdakdok", icon: "person-outline", iconBg: theme.success + "15", iconColor: theme.success },
              { label: t(language, "aboutEmail"), value: "dakdekdikdokduk123@gmail.com", icon: "mail-outline", iconBg: theme.warning + "15", iconColor: theme.warning },
              { label: t(language, "aboutPlatform"), value: "Android", icon: "logo-android", iconBg: theme.success + "15", iconColor: theme.success },
            ].map((row, i, arr) => (
              <View
                key={i}
                style={[
                  styles.aboutRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.aboutLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: row.iconBg }]}>
                    <Ionicons name={row.icon} size={15} color={row.iconColor} />
                  </View>
                  <Text style={[styles.aboutLabel, { color: theme.subText, fontSize: 13 * sz }]}>{row.label}</Text>
                </View>
                <Text style={[styles.aboutValue, { color: theme.text, fontSize: 13 * sz }]} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </AnimatedRow>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 8,
  },

  // Hero banner
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginBottom: 6,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
  heroSub: { fontSize: 12, fontWeight: "500", lineHeight: 17 },

  // Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
  },

  // Card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },

  // FAQ
  faqItem: { paddingHorizontal: 16, paddingVertical: 14 },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  faqQuestion: { fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 },
  faqAnswer: { fontSize: 13, fontWeight: "400", lineHeight: 19, marginTop: 8 },

  // Contact form
  formNote: { fontSize: 12, fontWeight: "500", lineHeight: 17, marginBottom: 2 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: "500",
    borderWidth: 1.5,
  },
  textarea: { height: 110, paddingTop: 12 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 2,
  },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // About
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  aboutLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  aboutLabel: { fontSize: 13, fontWeight: "500" },
  aboutValue: { fontSize: 13, fontWeight: "600", maxWidth: "50%" },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 20,
    letterSpacing: 0.3,
  },
});