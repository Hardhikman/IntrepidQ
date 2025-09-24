import { useRouter } from 'next/router'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// Define the documentation structure with categories
const docsStructure = {
  "Getting Started": [
    { id: "PROJECT_OVERVIEW", title: "Project Overview", description: "Introduction to the IntrepidQ AI system" },
    { id: "TECHNOLOGY_STACK", title: "Technology Stack", description: "Overview of the technologies used in the IntrepidQ AI system" },
    { id: "DIRECTORY_STRUCTURE", title: "Directory Structure", description: "Organization of files and folders in the project" },
    { id: "GETTING_STARTED", title: "Getting Started", description: "Setup and configuration guide for IntrepidQ AI" }
  ],
  "Architecture": [
    { id: "FRONTEND_ARCHITECTURE", title: "Frontend Architecture", description: "Structure and components of the frontend application" },
    { id: "BACKEND_ARCHITECTURE", title: "Backend Architecture", description: "Design and components of the backend services" }
  ],
  "API & Data": [
    { id: "API_REFERENCE", title: "API Reference", description: "Documentation for available API endpoints" },
    { id: "DATA_MODELS", title: "Data Models", description: "Database schema and data structures" }
  ],
  "Features & Operations": [
    { id: "CORE_FEATURES", title: "Core Features", description: "Key functionalities and capabilities of the system" },
    { id: "DEPLOYMENT_OPERATIONS", title: "Deployment Operations", description: "Guides for deploying and managing the system" }
  ],
  "Development": [
    { id: "CONTRIBUTING", title: "Contributing", description: "Guidelines for contributing to the project" },
    { id: "CHANGELOG", title: "Changelog", description: "History of changes and updates to the system" }
  ]
}

export default function DocsIndex() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-lg">Loading documentation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              IntrepidQ Documentation
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mt-2">
              Comprehensive guide to understanding and using IntrepidQ
            </p>
          </div>
          
          <div className="p-6">
            {Object.entries(docsStructure).map(([category, docs]) => (
              <div key={category} className="mb-10">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {category}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {docs.map((doc) => (
                    <Link 
                      key={doc.id}
                      href={`/docs/${doc.id}`}
                      className="block bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-6 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
                    >
                      <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                        {doc.title}
                      </h3>
                      <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">
                        {doc.description}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}