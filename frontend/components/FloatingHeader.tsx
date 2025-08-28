"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AIntrepidQLogo } from "@/components/aintrepidq-logo";

interface FloatingHeaderProps {
  user: any;
  authLoading: boolean;
  signOut: () => void;
  signInWithGoogle: () => void;
}

export default function FloatingHeader({
  user,
  authLoading,
  signOut,
  signInWithGoogle,
}: FloatingHeaderProps) {
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google sign-in failed:", err?.message);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm rounded-b-2xl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <div className="border-2 border-orange-500 border-t-orange-500 border-r-blue-500 border-b-blue-500 border-l-orange-500 rounded-lg bg-white shadow-sm">
              <div className="px-2 py-1 sm:px-3 sm:py-2">
                <AIntrepidQLogo size="small" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-transparent hover:bg-orange-50 text-orange-600 border border-orange-200 font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full transition-all duration-200 hover:border-orange-300"
                >
                  Resources
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel className="text-purple-600 font-semibold">
                  Information & Resources
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/about")}>
                  About IntrepidQ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/blog")}>
                  Blog
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/privacy-policy")}>
                  Privacy Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/terms-of-service")}>
                  Terms of Service
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/acceptable-use-policy")}>
                  Acceptable Use
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Separator */}
            <Separator orientation="vertical" className="h-6 bg-gray-300" />

            {/* User Menu or Sign In */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-200 font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full transition-all duration-200 hover:border-blue-300"
                  >
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuLabel className="text-orange-600 font-semibold">
                    {authLoading ? "Checking..." : user?.email ?? "Guest"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={handleGoogleSignIn}
                className="bg-transparent hover:bg-gradient-to-r hover:from-orange-100 hover:to-blue-100 text-orange-600 border border-orange-200 font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full transition-all duration-200 hover:border-orange-300 whitespace-nowrap"
                disabled={authLoading}
              >
                {authLoading ? "Loading..." : "Sign in with Google"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
