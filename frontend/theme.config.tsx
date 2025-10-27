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