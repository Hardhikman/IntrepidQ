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
        {/* Added SEO meta tags to improve indexing */}
        <meta name="robots" content="index, follow" />
        <meta name="googlebot" content="index, follow" />
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
        {/* Open Graph meta tags for better social sharing and indexing */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="IntrepidQ AI" />
        <meta property="og:title" content="IntrepidQ AI - UPSC Preparation Assistant" />
        <meta 
          property="og:description" 
          content="India's first NLP and RAG based AI assistant for UPSC CSE preparation. Generate context-aware mains questions with AI assistance." 
        />
        <meta property="og:url" content="https://intrepidq.xyz" />
        <meta property="og:image" content="https://intrepidq.xyz/og-image.jpg" />
        <meta property="og:image:alt" content="IntrepidQ AI - UPSC Preparation Assistant" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@intrepidq" />
        <meta name="twitter:title" content="IntrepidQ AI - UPSC Preparation Assistant" />
        <meta 
          name="twitter:description" 
          content="India's first NLP and RAG based AI assistant for UPSC CSE preparation. Generate context-aware mains questions with AI assistance." 
        />
        <meta name="twitter:image" content="https://intrepidq.xyz/og-image.jpg" />
        {/* JSON-LD Structured Data */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "IntrepidQ AI",
            "url": "https://intrepidq.xyz",
            "description": "India's first NLP and RAG based AI assistant for UPSC CSE preparation. Generate context-aware mains questions with AI assistance.",
            "publisher": {
              "@type": "Organization",
              "name": "IntrepidQ AI",
              "logo": {
                "@type": "ImageObject",
                "url": "https://intrepidq.xyz/logo.png"
              }
            }
          })
        }} />
      </Head>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen flex flex-col bg-background text-foreground">
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