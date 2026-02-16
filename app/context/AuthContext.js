import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check current session on mount
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setDriverProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
    } catch (err) {
      console.error('Error checking session:', err);
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
      const { data, error } = await supabase
        .from('driver_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
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
