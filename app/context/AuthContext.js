import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../lib/supabase';
import useDriverStore from '../store/useDriverStore';
import useChatStore from '../store/useChatStore';
import useModerationStore from '../store/useModerationStore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  // null = still loading from storage, true/false once known
  const [termsGateAccepted, setTermsGateAccepted] = useState(null);

  const TERMS_GATE_KEY = 'duolink_terms_gate_v1';

  const continueAsGuest = () => setIsGuest(true);
  const exitGuest = () => setIsGuest(false);

  const acceptTerms = async () => {
    try {
      await AsyncStorage.setItem(TERMS_GATE_KEY, new Date().toISOString());
    } catch (err) {
      // Persist failed — still let the user through this session
    }
    setTermsGateAccepted(true);
  };

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Load device-level Terms/EULA gate acceptance (applies to guests too)
    AsyncStorage.getItem(TERMS_GATE_KEY)
      .then((value) => setTermsGateAccepted(!!value))
      .catch(() => setTermsGateAccepted(false));

    // Check current session on mount
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_FAILED') {
          setUser(null);
          setProfile(null);
          setDriverProfile(null);
          setLoading(false);
          if (event === 'TOKEN_REFRESH_FAILED') {
            await supabase.auth.signOut();
          }
          return;
        }
        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            setUser(null);
            setProfile(null);
            setDriverProfile(null);
          } else {
            setIsGuest(false);
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        }
        setLoading(false);
      }
    );

    // Refresh session when app comes back to foreground
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        supabase.auth.getSession().then(({ data: { session }, error }) => {
          if (error && (error.message?.includes('Refresh Token') || error.name === 'AuthApiError')) {
            // Refresh token expired/revoked — sign out so user sees login screen
            supabase.auth.signOut();
            return;
          }
          if (session) {
            setUser(session.user);
          }
        });
      }
      appState.current = nextState;
    });

    return () => {
      subscription?.unsubscribe();
      appStateSub.remove();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        // Invalid refresh token — clear stale auth state so user sees login screen
        if (error.message?.includes('Refresh Token') || error.name === 'AuthApiError') {
          await supabase.auth.signOut();
        }
        setLoading(false);
        return;
      }
      if (!session) {
        setLoading(false);
        return;
      }
      if (session.user) {
        if (!session.user.email_confirmed_at) {
          setUser(null);
          setProfile(null);
          setDriverProfile(null);
        } else {
          setIsGuest(false);
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      }
    } catch (err) {
      // Network error — don't sign out, just stop loading.
      // User may still have a valid refresh token for when connectivity returns.
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Backfill Terms/EULA acceptance recorded at sign-up (carried in auth metadata)
      if (!profileData?.terms_accepted_at) {
        const { data: authData } = await supabase.auth.getUser();
        const acceptedAt = authData?.user?.user_metadata?.terms_accepted_at;
        if (acceptedAt) {
          await supabase
            .from('profiles')
            .update({ terms_accepted_at: acceptedAt })
            .eq('id', userId);
          setProfile({ ...profileData, terms_accepted_at: acceptedAt });
        }
      }

      // Load the set of users this account has blocked (for feed filtering)
      useModerationStore.getState().fetchBlocked(userId);

      // If user is a driver, fetch driver profile
      if (profileData?.role === 'driver') {
        const { data: driverData, error: driverError } = await supabase
          .from('driver_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!driverError && driverData) {
          setDriverProfile(driverData);
        }
      }
    } catch (err) {
      // Profile fetch failed — user stays logged in with stale data
    }
  };

  const signUp = async ({ email, password, firstname, lastname, phone, role, termsAccepted }) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstname,
            lastname,
            phone,
            role: role || 'owner',
            ...(termsAccepted ? { terms_accepted_at: new Date().toISOString() } : {}),
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setIsGuest(false);
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const signInWithOTP = async ({ phone }) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const verifyOTP = async ({ phone, token }) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Reset Zustand stores to prevent data leakage between accounts
      useDriverStore.getState().resetStore();
      useChatStore.getState().resetStore();
      useModerationStore.getState().resetStore();
      setUser(null);
      setProfile(null);
      setDriverProfile(null);
      setIsGuest(false);
    } catch (err) {
      // Sign-out failed — state already cleared above
    }
  };

  const updateProfile = async (updates) => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const updateDriverProfile = async (updates) => {
    try {
      setError(null);

      // Try update first
      const { data, error } = await supabase
        .from('driver_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // If no row exists yet, create one
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('driver_profiles')
            .insert({ user_id: user.id, ...updates })
            .select()
            .single();

          if (insertError) throw insertError;
          setDriverProfile(newData);
          return { data: newData, error: null };
        }
        throw error;
      }

      setDriverProfile(data);
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const value = {
    user,
    profile,
    driverProfile,
    loading,
    error,
    isGuest,
    continueAsGuest,
    exitGuest,
    termsGateAccepted,
    acceptTerms,
    isDriver: profile?.role === 'driver',
    isOwner: profile?.role === 'owner',
    isAdmin: profile?.role === 'admin',
    signUp,
    signIn,
    signInWithOTP,
    verifyOTP,
    signOut,
    updateProfile,
    updateDriverProfile,
    refreshProfile: () => fetchProfile(user?.id),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
