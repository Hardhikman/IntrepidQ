import { promises as fs } from 'fs'
import { join } from 'path'
import DocPage from '@/components/DocPage'

// This gets called at build time
export async function getStaticProps() {
  const docsDirectory = join(process.cwd(), 'content', 'docs')
  const fullPath = join(docsDirectory, 'BACKEND_ARCHITECTURE.md')
  
  try {
    const fileContents = await fs.readFile(fullPath, 'utf8')
    
    // Enhanced frontmatter extraction
    let title = 'Backend Architecture'
    let description = ''
    
    // Extract frontmatter if present
    if (fileContents.startsWith('---')) {
      const frontmatterEnd = fileContents.indexOf('---', 3)
      if (frontmatterEnd > 0) {
        const frontmatter = fileContents.substring(3, frontmatterEnd).trim()
        const titleMatch = frontmatter.match(/title:\s*(.*)/)
        const descriptionMatch = frontmatter.match(/description:\s*(.*)/)
        
        if (titleMatch) title = titleMatch[1].trim()
        if (descriptionMatch) description = descriptionMatch[1].trim()
      }
    }
    
    // Extract content (everything after the frontmatter)
    let content = fileContents
    if (fileContents.startsWith('---')) {
      const frontmatterEnd = fileContents.indexOf('---', 3)
      if (frontmatterEnd > 0) {
        content = fileContents.substring(frontmatterEnd + 3).trim()
      }
    }
    
    return {
      props: {
        title,
        description,
        content,
        docId: 'BACKEND_ARCHITECTURE'
      }
    }
  } catch (error) {
    return {
      notFound: true
    }
  }
}

export default function BACKEND_ARCHITECTUREDoc({ title, description, content, docId }: { title: string, description: string, content: string, docId: string }) {
  return <DocPage title={title} description={description} content={content} docId={docId} />
}