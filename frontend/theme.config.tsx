import React from 'react'
import Link from 'next/link'

const config = {
  logo: (
    <Link href="/" style={{ textDecoration: 'none' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '0.5rem',
        backgroundColor: '#0f0f0f',
        color: '#22c55e',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        fontWeight: '600',
        fontSize: '0.75rem',
        cursor: 'pointer',
        border: '1px solid #3f3f3f',
        transition: 'all 0.2s ease-in-out',
        whiteSpace: 'nowrap',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#1a1a1a';
        e.currentTarget.style.borderColor = '#525252';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = '#0f0f0f';
        e.currentTarget.style.borderColor = '#3f3f3f';
      }}>
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