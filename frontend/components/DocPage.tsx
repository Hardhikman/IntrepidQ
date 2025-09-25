import { useEffect, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {remarkMermaid} from '@theguild/remark-mermaid'
import DocSidebar from '@/components/DocSidebar'

interface DocPageProps {
  title: string
  description?: string
  content: string
  docId: string
}

// Custom component for handling headings
const CustomHeading = ({ level, children, ...props }: any) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const headingClasses = {
    1: "text-4xl font-bold mt-10 mb-6 text-gray-900 dark:text-white",
    2: "text-3xl font-semibold mt-8 mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2",
    3: "text-2xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200",
    4: "text-xl font-semibold mt-5 mb-2 text-gray-800 dark:text-gray-200",
    5: "text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200",
    6: "text-base font-semibold mt-3 mb-2 text-gray-800 dark:text-gray-200"
  };
  
  return <Tag className={headingClasses[level as keyof typeof headingClasses]} {...props}>{children}</Tag>;
};

// Custom component for handling code blocks
const CustomCodeBlock = ({ inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : 'plaintext'
  
  // Handle mermaid diagrams
  if (language === 'mermaid') {
    return (
      <div className="mermaid-container my-4 rounded-lg overflow-hidden">
        <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto" {...props}>
          <code className="language-mermaid">{children}</code>
        </pre>
      </div>
    )
  }
  
  // For inline code
  if (inline) {
    return (
      <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    )
  }
  
  // For block code
  return (
    <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto" {...props}>
      <code className={`language-${language}`}>
        {children}
      </code>
    </pre>
  )
}

// Custom component for handling list items
const CustomListItem = ({ children, ...props }: any) => {
  return (
    <li className="ml-4 mb-1" {...props}>
      {children}
    </li>
  );
};

// Custom component for handling ordered lists
const CustomOrderedList = ({ children, ...props }: any) => {
  return (
    <ol className="list-decimal mt-2 mb-4 ml-4 space-y-1" {...props}>
      {children}
    </ol>
  );
};

// Custom component for handling unordered lists
const CustomUnorderedList = ({ children, ...props }: any) => {
  return (
    <ul className="list-disc mt-2 mb-4 ml-4 space-y-1" {...props}>
      {children}
    </ul>
  );
};

export default function DocPage({ title, description, content, docId }: DocPageProps) {
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

  // Process content to remove frontmatter if present
  let cleanContent = content
  if (content.startsWith('---')) {
    const frontmatterEnd = content.indexOf('---', 3)
    if (frontmatterEnd > 0) {
      cleanContent = content.substring(frontmatterEnd + 3).trim()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <DocSidebar />
          </div>
          
          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {description && (
                  <p className="text-lg text-gray-700 dark:text-gray-300 mt-2">
                    {description}
                  </p>
                )}
              </div>
              
              <div className="p-6">
                <div className="prose max-w-none dark:prose-invert prose-p:mb-4 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-code:before:hidden prose-code:after:hidden prose-code:bg-gray-100 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-lg prose-pre:my-4 prose-pre:overflow-x-auto prose-li:ml-4 prose-li:mb-1 prose-ul:mt-2 prose-ul:mb-4 prose-ul:ml-4 prose-ul:space-y-1 prose-ol:mt-2 prose-ol:mb-4 prose-ol:ml-4 prose-ol:space-y-1 prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:underline dark:prose-a:text-blue-400 dark:prose-a:hover:text-blue-300">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMermaid]}
                    components={{
                      h1: (props) => <CustomHeading level={1} {...props} />,
                      h2: (props) => <CustomHeading level={2} {...props} />,
                      h3: (props) => <CustomHeading level={3} {...props} />,
                      h4: (props) => <CustomHeading level={4} {...props} />,
                      h5: (props) => <CustomHeading level={5} {...props} />,
                      h6: (props) => <CustomHeading level={6} {...props} />,
                      code: CustomCodeBlock,
                      li: CustomListItem,
                      ol: CustomOrderedList,
                      ul: CustomUnorderedList
                    }}
                  >
                    {cleanContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <Link 
                href="/docs"
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                ← Back to Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
