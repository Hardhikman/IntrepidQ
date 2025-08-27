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
        <div className="flex items-center justify-between h-12">
          {/* Logo/Title */}
          <div className="flex items-center">
            <div className="border-2 border-orange-500 border-t-orange-500 border-r-blue-500 border-b-blue-500 border-l-orange-500 rounded-lg bg-white shadow-sm">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 px-3 py-2">
                IntrepidQ.ai
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-transparent hover:bg-orange-50 text-orange-600 border border-orange-200 font-medium px-3 py-2 text-xs rounded-full transition-all duration-200 hover:border-orange-300"
                >
                  <span className="hidden sm:inline">Resources</span>
                  <span className="sm:hidden">R</span>
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
            <Separator orientation="vertical" className="h-6 bg-gray-300 hidden sm:block" />

            {/* User Menu or Sign In */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-200 font-medium px-3 py-2 text-xs rounded-full transition-all duration-200 hover:border-blue-300"
                  >
                    <span className="hidden sm:inline">Menu</span>
                    <span className="sm:hidden">M</span>
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
                className="bg-transparent hover:bg-gradient-to-r hover:from-orange-100 hover:to-blue-100 text-orange-600 border border-orange-200 font-medium px-3 py-2 text-xs rounded-full transition-all duration-200 hover:border-orange-300"
                disabled={authLoading}
              >
                <span className="hidden sm:inline">
                  {authLoading ? "Loading..." : "Sign in with Google"}
                </span>
                <span className="sm:hidden">
                  {authLoading ? "..." : "G"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
