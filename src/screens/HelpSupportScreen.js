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
function FAQItem({ question, answer, theme, isLast }) {
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

  const maxHeight = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 120] });
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
        <Text style={[styles.faqQuestion, { color: theme.text }]}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotateZ }] }}>
          <Ionicons name="add" size={18} color={theme.subText} />
        </Animated.View>
      </View>
      <Animated.View style={{ maxHeight, overflow: "hidden" }}>
        <Text style={[styles.faqAnswer, { color: theme.subText }]}>{answer}</Text>
      </Animated.View>
    </Pressable>
  );
}

const FAQ_DATA = [
  {
    question: "How do I add a transaction?",
    answer:
      "Tap the '+' button on the home screen or the Add tab. Fill in the amount, category, and date, then hit Save. Your balance updates instantly.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Guest accounts store data locally on your device only. Linking a Google account syncs everything securely to the cloud so you never lose it.",
  },
  {
    question: "How do I switch currencies?",
    answer:
      "Go to Profile → Preferences → Currency and tap your preferred symbol. All amounts display in your chosen currency right away.",
  },
  {
    question: "Can I export my transactions?",
    answer:
      "Export is coming soon! We're working on CSV and PDF export. Stay tuned for updates in the next release.",
  },
  {
    question: "How do I delete a transaction?",
    answer:
      "Swipe left on any transaction in the list to reveal the Delete option, or tap the transaction to open it and select Delete from the menu.",
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HelpSupportScreen({ navigation }) {
  const { isDarkMode, session } = useStore();
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const theme = {
    bg: isDarkMode ? "#0d0d0d" : "#f7f7f5",
    surface: isDarkMode ? "#1a1a1a" : "#ffffff",
    surfaceAlt: isDarkMode ? "#222222" : "#f0efec",
    text: isDarkMode ? "#f0f0f0" : "#111111",
    subText: isDarkMode ? "#666666" : "#999999",
    border: isDarkMode ? "#2a2a2a" : "#e8e8e4",
    accent: "#3B7DD8",
    danger: "#E05252",
    success: "#27AE60",
    warning: "#F39C12",
  };

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing Info", "Please fill in both the subject and message.");
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
        Alert.alert("No Email App", "We couldn't find a mail app. Please email us at support@moneytracker.app");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
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
      behavior={undefined}
    >
      {/* ── HEADER ── */}
      <AnimatedRow delay={0}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="arrow-back" size={18} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
          <View style={{ width: 36 }} />
        </View>
      </AnimatedRow>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── HERO BANNER ── */}
        <AnimatedRow delay={60}>
          <View style={[styles.heroBanner, { backgroundColor: theme.accent + "10", borderColor: theme.accent + "20" }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.accent + "18" }]}>
              <Ionicons name="headset-outline" size={28} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>We're here to help</Text>
              <Text style={[styles.heroSub, { color: theme.subText }]}>
                Browse the FAQ or drop us an email — we reply within 24 hours.
              </Text>
            </View>
          </View>
        </AnimatedRow>

        {/* ── FAQ ── */}
        <AnimatedRow delay={120}>
          <Text style={[styles.sectionLabel, { color: theme.subText }]}>Frequently Asked</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {FAQ_DATA.map((item, i) => (
              <FAQItem
                key={i}
                question={item.question}
                answer={item.answer}
                theme={theme}
                isLast={i === FAQ_DATA.length - 1}
              />
            ))}
          </View>
        </AnimatedRow>

        {/* ── CONTACT FORM ── */}
        <AnimatedRow delay={200}>
          <Text style={[styles.sectionLabel, { color: theme.subText }]}>Contact Us</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, padding: 16, gap: 10 }]}>
            <Text style={[styles.formNote, { color: theme.subText }]}>
              Opens your mail app with a pre-filled message to{" "}
              <Text style={{ color: theme.accent }}>dakdekdikdokduk123@gmail.com</Text>
            </Text>

            <TextInput
              style={inputStyle("subject")}
              placeholder="Subject"
              placeholderTextColor={theme.subText}
              value={subject}
              onChangeText={setSubject}
              onFocus={() => setFocusedField("subject")}
              onBlur={() => setFocusedField(null)}
              returnKeyType="next"
            />

            <TextInput
              style={[inputStyle("message"), styles.textarea]}
              placeholder="Describe your issue or question..."
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
                <Text style={styles.sendBtnText}>{sending ? "Opening mail…" : "Send Message"}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </AnimatedRow>

        {/* ── ABOUT THE APP ── */}
        <AnimatedRow delay={280}>
          <Text style={[styles.sectionLabel, { color: theme.subText }]}>About</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { label: "App Name", value: "Money Tracker", icon: "phone-portrait-outline", iconBg: theme.accent + "15", iconColor: theme.accent },
              { label: "Version", value: "1.0.0", icon: "code-slash-outline", iconBg: "#7C3AED15", iconColor: "#7C3AED" },
              { label: "Developer", value: "dukdakdok", icon: "person-outline", iconBg: theme.success + "15", iconColor: theme.success },
              { label: "Support Email", value: "dakdekdikdokduk123@gmail.com", icon: "mail-outline", iconBg: theme.warning + "15", iconColor: theme.warning },
              { label: "Platform", value: "Android", icon: "logo-android", iconBg: theme.success + "15", iconColor: theme.success },
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
                  <Text style={[styles.aboutLabel, { color: theme.subText }]}>{row.label}</Text>
                </View>
                <Text style={[styles.aboutValue, { color: theme.text }]} numberOfLines={1}>
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
    borderRadius: 10,
    borderWidth: 1,
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