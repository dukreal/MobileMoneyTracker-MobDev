import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase/supabaseClient";
import {
  getPendingOps,
  removePendingOp,
  getPendingCount,
  cacheTransactions,
  deleteLocalTransaction,
} from "../db/localDB";

export const useStore = create(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      session: null,
      user: null,
      isGuest: true,

      setSession: (session) => {
        console.log("setSession called, is_anonymous:", session?.user?.is_anonymous);
        set({
          session,
          user: session?.user || null,
          isGuest: session?.user?.is_anonymous ?? (session === null ? true : false),
        });
      },

      // --- SETTINGS STATE ---
      isDarkMode: true,
      currency: "₱",
      language: "english",
      textSize: "medium",
      colorTheme: "green",
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      setCurrency: (cur) => set({ currency: cur }),
      setLanguage: (lang) => set({ language: lang }),
      setTextSize: (size) => set({ textSize: size }),
      setColorTheme: (theme) => set({ colorTheme: theme }),

      // --- DATA STATE ---
      transactions: [],
      setTransactions: (txs) => set({ transactions: txs }),

      // --- OFFLINE STATE ---
      isOnline: true,
      setIsOnline: (val) => set({ isOnline: val }),
      pendingCount: 0,
      setPendingCount: (n) => set({ pendingCount: n }),

      refreshPendingCount: async () => {
        const count = await getPendingCount();
        set({ pendingCount: count });
      },

      syncQueue: async () => {
        const pending = await getPendingOps();
        if (pending.length === 0) return;
        console.log(`[Sync] Starting sync of ${pending.length} pending ops`);
        for (const op of pending) {
          try {
            if (op.op_type === "INSERT") {
              const { is_local, ...payload } = op.payload;
              const { error } = await supabase.from("transactions").insert([payload]);
              if (error) throw error;
            } else if (op.op_type === "UPDATE") {
              const { id, ...updateFields } = op.payload;
              const { error } = await supabase.from("transactions").update(updateFields).eq("id", id);
              if (error) throw error;
            } else if (op.op_type === "DELETE") {
              const { error } = await supabase.from("transactions").delete().eq("id", op.payload.id);
              if (error) throw error;
              await deleteLocalTransaction(op.payload.id);
            }
            await removePendingOp(op.local_id);
            console.log(`[Sync] ✓ ${op.op_type} ${op.local_id}`);
          } catch (err) {
            console.warn(`[Sync] ✗ Failed ${op.op_type} ${op.local_id}:`, err.message);
          }
        }
        const userId = get().user?.id;
        if (userId) {
          try {
            const { data, error } = await supabase
              .from("transactions").select("*")
              .eq("user_id", userId).order("created_at", { ascending: false });
            if (!error && data) {
              set({ transactions: data });
              await cacheTransactions(userId, data);
            }
          } catch (e) {
            console.warn("[Sync] Re-fetch failed:", e.message);
          }
        }
        await get().refreshPendingCount();
        console.log("[Sync] Done");
      },

      logout: async () => {
        set({ session: null, user: null, isGuest: true, transactions: [], pendingCount: 0 });
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
