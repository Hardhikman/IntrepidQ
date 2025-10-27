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
import { ThemeToggle } from "@/components/theme-toggle";

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
    <header className="fixed top-2 z-50 w-full bg-background text-foreground rounded-full max-w-3xl left-1/2 -translate-x-1/2 border border-border shadow-md">
      {/* Header content */}
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
            variant="outline"
            onClick={() => router.push("/blogs/about-intrepidq")}
            className="font-medium px-3 py-2 text-sm rounded-lg hidden sm:flex"
          >
            About
          </Button>
          
          {/* New Why IntrepidQ button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/blogs/how-intrepidq-enhances-upsc-preparation")}
            className="font-medium px-3 py-2 text-sm rounded-lg hidden sm:flex"
          >
            Why ?
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Separator */}
          <Separator orientation="vertical" className="h-6 bg-border hidden sm:block" />

          {/* User Menu or Sign In */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full"
                >
                  <MenuIcon className="mr-1 h-4 w-4" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuLabel className="font-semibold">
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
              variant="outline"
              onClick={handleGoogleSignIn}
              className="font-medium px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm rounded-full whitespace-nowrap"
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