import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";
import "../styles/globals.css";
import FloatingFeedbackButton from "@/components/FloatingFeedbackButton";
import Head from "next/head";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/components/Footer";

export default function App({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get the canonical URL without query parameters
  const getCanonicalUrl = () => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.search = ""; // Remove all query parameters
      return url.toString();
    }
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          IntrepidQ AI - India's first NLP and RAG based AI assistant for UPSC
          CSE preparation
        </title>
        <meta
          name="description"
          content="Generate context-aware UPSC CSE mains questions with AI assistance"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="application-name" content="IntrepidQ" />
        <meta name="apple-mobile-web-app-title" content="IntrepidQ" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <link rel="canonical" href={getCanonicalUrl()} />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="/android-chrome-192x192.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="512x512"
          href="/android-chrome-512x512.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6" />
      </Head>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <div className="min-h-screen flex flex-col bg-[#0f0f0f] text-white">
          <main className="flex-grow">
            <Component {...pageProps} session={session} />
          </main>
          <div className="w-full">
            <Footer />
          </div>
          <FloatingFeedbackButton />
          <Toaster />
        </div>
        <Analytics />
        <SpeedInsights />
      </ThemeProvider>
    </>
  );
}
