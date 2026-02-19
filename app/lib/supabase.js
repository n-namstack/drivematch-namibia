import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// NamDriver Supabase Configuration
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://lpggxqfljjrqdukmwcrk.supabase.co';
const supabaseKey = Constants.expoConfig?.extra?.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ2d4cWZsampycWR1a213Y3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDAxMTYsImV4cCI6MjA4NjgxNjExNn0.6JDwNbaWVfEikP4vBzS0sltQM8Tfc2slrt6VjVfeL7Y';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
