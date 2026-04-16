import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Go to Supabase Settings > API to find these
const supabaseUrl = 'https://yrqvncdwnzuruohgmfup.supabase.co';
const supabaseAnonKey = 'sb_publishable_6Ga6Q6_FPc0kD58UtFturQ_PigvtljO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});