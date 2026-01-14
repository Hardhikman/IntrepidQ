import React from 'react'
import Link from 'next/link'

const config = {
  logo: (
    <Link href="/" className="no-underline">
      <div className="
        flex items-center justify-center gap-2 
        px-3 py-2 rounded-md font-semibold text-xs 
        cursor-pointer w-full box-border whitespace-nowrap
        transition-all duration-200
        bg-gray-100 text-gray-700 border border-gray-300
        hover:bg-gray-200 hover:border-gray-400
        dark:bg-neutral-900 dark:text-green-500 dark:border-neutral-700
        dark:hover:bg-neutral-800 dark:hover:border-neutral-500
      ">
        <span>Back to IntrepidQ AI</span>
      </div>
    </Link>
  ),

  // Removed project property to eliminate GitHub link
  useNextSeoProps() {
    return {
      titleTemplate: '%s – IntrepidQ',
      defaultTitle: 'IntrepidQ AI - India\'s first NLP and RAG based AI assistant for UPSC CSE preparation',
      description: 'Generate context-aware UPSC CSE mains questions with AI assistance',
      canonical: 'https://intrepidq.xyz',
      openGraph: {
        type: 'website',
        locale: 'en_IE',
        url: 'https://intrepidq.xyz',
        site_name: 'IntrepidQ AI',
        title: 'IntrepidQ AI - India\'s first NLP and RAG based AI assistant for UPSC CSE preparation',
        description: 'Generate context-aware UPSC CSE mains questions with AI assistance',
        images: [
          {
            url: 'https://intrepidq.xyz/og-image.jpg',
            width: 1200,
            height: 630,
            alt: 'IntrepidQ AI - UPSC Preparation Assistant',
          },
        ],
      },
      twitter: {
        handle: '@intrepidq',
        site: '@intrepidq',
        cardType: 'summary_large_image',
      },
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="IntrepidQ Documentation" />
      <meta
        property="og:description"
        content="Documentation for IntrepidQ - India's first NLP and RAG based AI assistant for UPSC CSE preparation"
      />
      {/* Added structured data for better indexing */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "IntrepidQ Documentation",
          "url": "https://intrepidq.xyz/docs",
          "description": "Documentation for IntrepidQ - India's first NLP and RAG based AI assistant for UPSC CSE preparation",
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
    </>
  ),
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  // Removed editLink property to eliminate GitHub edit links
  navigation: {
    prev: true,
    next: true,
  },
  footer: {
    text: (
      <span>
        MIT {new Date().getFullYear()} © IntrepidQ AI.
      </span>
    ),
  },
}

export default config