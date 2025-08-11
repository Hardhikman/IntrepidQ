"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function AuthForm() {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const { toast } = useToast()

  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    if (isSignUp && !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(
          formData.email,
          formData.password,
          { full_name: formData.fullName }
        )

        if (error) throw new Error(error.message)

        toast({
          title: "Account Created 🎉",
          description: "Please check your email to verify your account.",
        })
      } else {
        const { error } = await signInWithEmail(formData.email, formData.password)

        if (error) throw new Error(error.message)

        toast({
          title: "Welcome Back 🚀",
          description: "Redirecting to your dashboard...",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setErrors({})
    setFormData({ email: "", password: "", fullName: "" })
    toast({
      title: isSignUp ? "Sign In Mode" : "Sign Up Mode",
      description: isSignUp ? "Switched to sign in" : "Switched to sign up",
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "✨ Create Account" : "🔐 Welcome Back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Join thousands of UPSC aspirants"
              : "Sign in to continue your UPSC preparation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder={
                  isSignUp
                    ? "Create a strong password (min 6 chars)"
                    : "Enter your password"
                }
                disabled={loading}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isSignUp
                  ? "Creating Account..."
                  : "Signing In..."
                : isSignUp
                ? "🚀 Create Account"
                : "🎯 Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-primary hover:underline"
            disabled={loading}
          >
            {isSignUp
              ? "🔐 Already have an account? Sign In"
              : "✨ Need an account? Sign Up"}
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}