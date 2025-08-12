"use client"

import React from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function AuthForm() {
  const { signInWithGoogle } = useAuth()
  const { toast } = useToast()

  const handleGoogle = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
      // Redirect will be handled by Supabase
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Google sign-in failed",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in or Sign up</CardTitle>
          <CardDescription>
            Use your Google account to continue. Email/password is not supported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
