import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import supabase from '../lib/supabase';
import useDriverStore from '../store/useDriverStore';
import useChatStore from '../store/useChatStore';
import useAgreementStore from '../store/useAgreementStore';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Check current session on mount
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setDriverProfile(null);
          setLoading(false);
          return;
        }
        if (session?.user) {
          if (!session.user.email_confirmed_at) {
            setUser(null);
            setProfile(null);
            setDriverProfile(null);
          } else {
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
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            // Session exists — Supabase auto-refreshes the access token
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
      if (error || !session) {
        // No valid session found — stay logged out but don't destroy tokens.
        // Supabase will auto-refresh if a refresh token exists in storage.
        setLoading(false);
        return;
      }
      if (session.user) {
        if (!session.user.email_confirmed_at) {
          setUser(null);
          setProfile(null);
          setDriverProfile(null);
        } else {
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
      console.error('Error fetching profile:', err);
    }
  };

  const signUp = async ({ email, password, firstname, lastname, phone, role }) => {
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
      useAgreementStore.getState().resetStore();
      setUser(null);
      setProfile(null);
      setDriverProfile(null);
    } catch (err) {
      console.error('Error signing out:', err);
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
