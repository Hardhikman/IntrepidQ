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
        backgroundColor: '#f9fafb',
        color: '#4f46e5',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        fontWeight: '600',
        fontSize: '0.75rem',
        cursor: 'pointer',
        border: '1px solid #e5e7eb',
        transition: 'all 0.2s ease-in-out',
        whiteSpace: 'nowrap',
        width: '100%',
        boxSizing: 'border-box'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = '#f3f4f6';
        e.currentTarget.style.borderColor = '#d1d5db';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}>
        <span>Back to IntrepidQ AI</span>
      </div>
    </Link>
  ),
  project: {
    link: 'https://github.com/Hardhikman/IntrepidQ',
  },
  docsRepositoryBase:
    'https://github.com/Hardhikman/IntrepidQ/blob/main/frontend',
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
  editLink: {
    text: 'Edit this page on GitHub',
  },
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