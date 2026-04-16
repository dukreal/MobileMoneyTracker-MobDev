import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStore = create(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      isGuest: true,
      
      setSession: (session) => {
        set({ 
          session, 
          user: session?.user || null,
          isGuest: session?.user?.is_anonymous ?? true 
        });
      },

      // --- SETTINGS STATE ---
      isDarkMode: false,
      currency: '₱',
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setCurrency: (cur) => set({ currency: cur }),

      // --- DATA STATE ---
      transactions: [],
      setTransactions: (txs) => set({ transactions: txs }),
      
      logout: () => set({ session: null, user: null, isGuest: true, transactions: [] }),
    }),
    {
      name: 'money-tracker-storage', // unique name for storage
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);