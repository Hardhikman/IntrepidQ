"use client";
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import AuthForm from '../components/AuthForm'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { User, Mail, Calendar, LogOut } from 'lucide-react'

interface ProfileProps {
  session: Session | null
}

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export default function Profile({ session }: ProfileProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    if (session) {
      getProfile()
    } else {
      setLoading(false)
    }
  }, [session])

  const getProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session?.user.id)
        .maybeSingle()

      if (error) {
        if (error.code === 'PGRST116') {
          // This is expected when a user has no profile yet.
          console.log('No profile found for user, which is fine.');
        } else {
          // Log other errors for debugging.
          console.error('Error loading profile:', error);
        }
      } else if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    try {
      setUpdating(true)
      const updates = {
        id: session?.user.id,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('user_profiles').upsert(updates)

      if (error) {
        console.error('Error updating profile:', error)
        throw error
      }

      setProfile({ ...profile!, full_name: fullName })
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile!')
    } finally {
      setUpdating(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-8">Sign In to View Profile</h1>
          <AuthForm />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
                  <Button
                    onClick={signOut}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white w-full sm:w-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <User className="mr-2 h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Email</p>
                <p className="font-medium text-sm sm:text-base">{session.user.email}</p>
              </div>
            </div>

            {profile?.created_at && (
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Member since</p>
                  <p className="font-medium text-sm sm:text-base">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="text-sm sm:text-base"
              />
            </div>

            <Button
              onClick={updateProfile}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 sm:mt-8 text-center">
                  <Button
                    onClick={() => router.push('/')}
                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white w-full sm:w-auto"
                  >
                    Back to Main page
                  </Button>
                </div>
      </div>
    </div>
  )
}
