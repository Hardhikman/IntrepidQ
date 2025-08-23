"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  session: Session | null;
  refreshProfile: () => Promise<void>;
  applyLocalGenerationIncrement: (increment?: number) => void;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, options?: any) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Fetch profile if user exists
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchProfile = async (userId: string) => {
      try {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        if (isMounted) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        // Only set loading to false after initialization
        if (initialized) {
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  // Realtime profile updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user_profiles:${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_profiles', 
          filter: `id=eq.${user.id}` 
        },
        (payload) => {
          const newRow = (payload as any).new;
          if (newRow) {
            setProfile((prev: any) => ({ ...prev, ...newRow }));
          } else {
            refreshProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const refreshProfile = async () => {
    try {
      const currentUser = session?.user || user;
      if (!currentUser) return;

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      
      setProfile(profileData);
    } catch (err) {
      console.error('refreshProfile error', err);
    }
  };

  const applyLocalGenerationIncrement = (increment: number = 1) => {
    setProfile((prev: any) => {
      if (!prev) return prev;
      const today = new Date().toISOString().slice(0, 10);
      const last = prev.last_generation_date;
      const baseCount = last === today ? (prev.generation_count_today || 0) : 0;
      return {
        ...prev,
        last_generation_date: today,
        generation_count_today: Math.min((baseCount as number) + increment, 999)
      };
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUpWithEmail = async (email: string, password: string, options?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options
      }
    });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account'
        }
      }
    });
    return { data, error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local'
      });
      
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      
      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Clear any local storage
      localStorage.removeItem('supabase.auth.token');
      
      return { error: null };
      
    } catch (error) {
      console.error('SignOut catch error:', error);
      setUser(null);
      setProfile(null);
      setSession(null);
      return { error: null };
    }
  };

  const value = {
    user,
    profile,
    loading,
    session,
    refreshProfile,
    applyLocalGenerationIncrement,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}