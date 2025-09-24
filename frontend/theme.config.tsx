import React from 'react'
import { useThemeConfig } from 'nextra-theme-docs'

const config = {
  logo: <span>IntrepidQ Documentation</span>,
  project: {
    link: 'https://github.com/Hardhikman/IntrepidQ',
  },
  docsRepositoryBase: 'https://github.com/Hardhikman/IntrepidQ/blob/main/frontend/content/docs',
  useNextSeoProps() {
    return {
      titleTemplate: '%s – IntrepidQ'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="IntrepidQ Documentation" />
      <meta property="og:description" content="Documentation for IntrepidQ - India's first NLP and RAG based AI assistant for UPSC CSE preparation" />
    </>
  ),
  sidebar: {
    titleComponent({ title, type }) {
      if (type === 'separator') {
        return <span className="cursor-default">{title}</span>
      }
      return <>{title}</>
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  toc: {
    backToTop: true
  },
  editLink: {
    text: 'Edit this page on GitHub'
  }
}

export default config