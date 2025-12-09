"use client";

import { Dashboard } from '@/components/Dashboard';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Dashboard - IntrepidQ AI</title>
        <meta name="description" content="User dashboard for IntrepidQ AI" />
        <link rel="canonical" href="https://intrepidq.xyz/dashboard" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Dashboard - IntrepidQ AI",
            "description": "User dashboard for IntrepidQ AI",
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
      <Dashboard onNavigateToGenerator={() => router.push('/')} />
    </>
  );
}