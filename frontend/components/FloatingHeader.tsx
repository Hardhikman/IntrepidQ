"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
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
    // Redirect to the dedicated signin page
    router.push("/auth/signin");
  };

  return (
    <header className="fixed top-2 z-50 w-full bg-[#0f0f0f] text-white rounded-full max-w-3xl left-1/2 -translate-x-1/2">
      {/* Circuit Board - Dark Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none rounded-full"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(34, 197, 94, 0.15) 19px, rgba(34, 197, 94, 0.15) 20px, transparent 20px, transparent 39px, rgba(34, 197, 94, 0.15) 39px, rgba(34, 197, 94, 0.15) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(34, 197, 94, 0.15) 19px, rgba(34, 197, 94, 0.15) 20px, transparent 20px, transparent 39px, rgba(34, 197, 94, 0.15) 39px, rgba(34, 197, 94, 0.15) 40px),
            radial-gradient(circle at 20px 20px, rgba(16, 185, 129, 0.18) 2px, transparent 2px),
            radial-gradient(circle at 40px 40px, rgba(16, 185, 129, 0.18) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px',
        }}
      />
      
      {/* Header content with relative positioning to appear above the background */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
        {/* Logo */}
        <div 
          onClick={() => router.push("/")}
          className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
          aria-label="Go to home page"
        >
          <AIntrepidQLogo size="small" />
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => router.push("/blogs/about-intrepidq")}
            className="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500 font-medium px-3 py-2 text-sm rounded-lg shadow-sm transition-all duration-200"
          >
            About
          </Button>
          
          {/* New Why IntrepidQ button */}
          <Button
            size="sm"
            onClick={() => router.push("/blogs/how-intrepidq-enhances-upsc-preparation")}
            className="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500 font-medium px-3 py-2 text-sm rounded-lg shadow-sm transition-all duration-200"
          >
            Why ?
          </Button>

          {/* Separator */}
          <Separator orientation="vertical" className="h-6 bg-gray-600" />

          {/* User Menu or Sign In */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500 font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full transition-all duration-200"
                >
                  <MenuIcon className="mr-1 h-4 w-4" />
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
              className="bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500 font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full transition-all duration-200 whitespace-nowrap"
              disabled={authLoading}
            >
              {authLoading ? "Loading..." : "Sign in"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}