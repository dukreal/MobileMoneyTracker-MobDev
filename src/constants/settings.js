// ─── Color Themes ─────────────────────────────────────────────────────────────
export const ACCENT_COLORS = {
  blue:   "#3B7DD8",
  green:  "#27AE60",
  orange: "#E67E22",
  rose:   "#E05282",
};

// ─── Text Sizes ───────────────────────────────────────────────────────────────
export const TEXT_SIZE_MULTIPLIER = {
  small:  0.85,
  medium: 1.0,
  large:  1.18,
};

// ─── Build Theme Object ───────────────────────────────────────────────────────
export function buildTheme(isDarkMode, colorTheme) {
  const accent = ACCENT_COLORS[colorTheme] ?? ACCENT_COLORS.blue;
  return {
    bg:         isDarkMode ? "#0d0d0d" : "#f2f2f0",
    surface:    isDarkMode ? "#1a1a1a" : "#ffffff",
    surfaceAlt: isDarkMode ? "#222222" : "#e8e8e4",
    card:       isDarkMode ? "#1e1e1e" : "#ffffff",
    text:       isDarkMode ? "#f0f0f0" : "#111111",
    subText:    isDarkMode ? "#666666" : "#999999",
    border:     isDarkMode ? "#2a2a2a" : "#d8d8d4",
    accent,
    danger:  "#E05252",
    success: "#27AE60",
    warning: "#F39C12",
  };
}

// ─── Translations ─────────────────────────────────────────────────────────────
const translations = {
  english: {
    // Home
    appName:       "Montra",
    income:        "Income",
    expense:       "Expense",
    balance:       "Balance",
    noRecords:     "No records for this day",
    // Add
    addTransaction: "Add Transaction",
    amount:        "Amount",
    notes:         "Notes",
    category:      "Category",
    save:          "Save",
    // Profile
    profile:       "Profile",
    guestUser:     "Guest User",
    localOnly:     "Local only",
    cloudSynced:   "Cloud synced",
    preferences:   "Preferences",
    currency:      "Currency",
    account:       "Account",
    linkGoogle:    "Link Google",
    saveToCloud:   "Save data to cloud",
    helpSupport:   "Help & Support",
    faqContact:    "FAQs and contact",
    signOut:       "Sign Out",
    // Settings
    settings:      "Settings",
    appearance:    "Appearance",
    themeMode:     "Theme Mode",
    dark:          "Dark",
    light:         "Light",
    colorTheme:    "Color Theme",
    textSize:      "Text Size",
    language:      "Language",
    // Analytics
    analytics:     "Analytics",
    week:          "Week",
    month:         "Month",
    year:          "Year",
  },
  filipino: {
    // Home
    appName:       "Montra",
    income:        "Kita",
    expense:       "Gastos",
    balance:       "Balanse",
    noRecords:     "Walang talaan para sa araw na ito",
    // Add
    addTransaction: "Magdagdag ng Transaksyon",
    amount:        "Halaga",
    notes:         "Mga Tala",
    category:      "Kategorya",
    save:          "I-save",
    // Profile
    profile:       "Profile",
    guestUser:     "Bisita",
    localOnly:     "Lokal lamang",
    cloudSynced:   "Naka-sync sa cloud",
    preferences:   "Mga Kagustuhan",
    currency:      "Pera",
    account:       "Account",
    linkGoogle:    "I-link ang Google",
    saveToCloud:   "I-save ang data sa cloud",
    helpSupport:   "Tulong at Suporta",
    faqContact:    "FAQs at makipag-ugnayan",
    signOut:       "Mag-sign Out",
    // Settings
    settings:      "Mga Setting",
    appearance:    "Hitsura",
    themeMode:     "Mode ng Tema",
    dark:          "Madilim",
    light:         "Maliwanag",
    colorTheme:    "Kulay ng Tema",
    textSize:      "Laki ng Teksto",
    language:      "Wika",
    // Analytics
    analytics:     "Analytics",
    week:          "Linggo",
    month:         "Buwan",
    year:          "Taon",
  },
};

export function t(language, key) {
  return translations[language]?.[key] ?? translations.english[key] ?? key;
}