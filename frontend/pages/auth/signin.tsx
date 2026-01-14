"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import Head from "next/head";
import { AIntrepidQLogo } from "@/components/aintrepidq-logo";

export default function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Redirect authenticated users to the main page
  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth or redirecting
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }


  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      // Redirect will be handled by Supabase
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Google sign-in failed",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - IntrepidQ AI</title>
        <meta name="description" content="Sign in to IntrepidQ for UPSC question generation" />
        <link rel="canonical" href="https://intrepidq.xyz/auth/signin" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Sign In - IntrepidQ AI",
            "description": "Sign in to IntrepidQ for UPSC question generation",
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-6 py-12 flex flex-col items-center">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome to <AIntrepidQLogo size="large" />
            </h1>
            <p className="mt-3 text-gray-700 dark:text-gray-300 font-bold">
              click below to evolve your UPSC preparation
            </p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors duration-200 mb-6 shadow-md"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            By continuing, you agree to our{" "}
            <Link href="/terms-of-service" className="text-orange-500 hover:text-orange-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-700 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}