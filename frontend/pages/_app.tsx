"use client";

import type { AppProps } from "next/app";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "../styles/globals.css";
import FloatingFeedbackButton from "@/components/FloatingFeedbackButton";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground">
          <Component {...pageProps} />
          <FloatingFeedbackButton />
          <Toaster />
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
