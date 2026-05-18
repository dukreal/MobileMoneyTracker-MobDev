import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { tr } from "date-fns/locale";

export const useStore = create(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      session: null,
      user: null,
      isGuest: true,

      setSession: (session) => {
        set({
          session,
          user: session?.user || null,
          isGuest: session?.user?.is_anonymous ?? true,
        });
      },

      // --- SETTINGS STATE ---
      isDarkMode: true,
      currency: "₱",
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setCurrency: (cur) => set({ currency: cur }),

      // --- DATA STATE ---
      transactions: [],
      setTransactions: (txs) => set({ transactions: txs }),

      logout: async () => {
        set({ session: null, user: null, isGuest: true, transactions: [] });
        await AsyncStorage.removeItem("money-tracker-storage");
      },
    }),
    {
      name: "money-tracker-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state.setHasHydrated(true);
      },
    },
  ),
);
