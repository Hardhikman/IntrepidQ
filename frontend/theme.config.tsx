import React from 'react'

const config = {
  logo: <span>Click here to go back to IntrepidQ home</span>,
  project: {
    link: 'https://github.com/Hardhikman/IntrepidQ',
  },
  docsRepositoryBase:
    'https://github.com/Hardhikman/IntrepidQ/blob/main/frontend/pages/docs',
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
    defaultMenuCollapseLevel: 0,
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
