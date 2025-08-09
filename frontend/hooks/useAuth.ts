import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Add the missing authentication functions
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUpWithEmail = async (email: string, password: string, options?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options // This will include full_name
      }
    })
    return { data, error }
  }

  // 🔧 FIX: Improved signOut with better error handling
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local' // Use local scope instead of global to avoid 403
      })
      
      if (error) {
        console.error('Supabase signOut error:', error)
        // Even if Supabase throws an error, clear local state
      }
      
      // Force clear local state regardless of Supabase response
      setUser(null)
      
      // Clear any local storage
      localStorage.removeItem('supabase.auth.token')
      
      return { error: null } // Always return success for better UX
      
    } catch (error) {
      console.error('SignOut catch error:', error)
      // Still clear local state even on error
      setUser(null)
      return { error: null }
    }
  }

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}