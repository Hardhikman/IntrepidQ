import Link from 'next/link'
import { useRouter } from 'next/router'

// Define the documentation structure
const docsStructure = [
  { id: "PROJECT_OVERVIEW", title: "Project Overview" },
  { id: "TECHNOLOGY_STACK", title: "Technology Stack" },
  { id: "DIRECTORY_STRUCTURE", title: "Directory Structure" },
  { id: "GETTING_STARTED", title: "Getting Started" },
  { id: "FRONTEND_ARCHITECTURE", title: "Frontend Architecture" },
  { id: "BACKEND_ARCHITECTURE", title: "Backend Architecture" },
  { id: "API_REFERENCE", title: "API Reference" },
  { id: "DATA_MODELS", title: "Data Models" },
  { id: "CORE_FEATURES", title: "Core Features" },
  { id: "DEPLOYMENT_OPERATIONS", title: "Deployment Operations" },
  { id: "CONTRIBUTING", title: "Contributing" },
  { id: "CHANGELOG", title: "Changelog" }
]

export default function DocSidebar() {
  const router = useRouter()
  const currentPath = router.asPath

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Documentation</h2>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link 
              href="/docs" 
              className={`block px-3 py-2 rounded-md text-sm ${
                currentPath === '/docs' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Index
            </Link>
          </li>
          {docsStructure.map((doc) => (
            <li key={doc.id}>
              <Link 
                href={`/docs/${doc.id}`} 
                className={`block px-3 py-2 rounded-md text-sm ${
                  currentPath === `/docs/${doc.id}` 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {doc.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}