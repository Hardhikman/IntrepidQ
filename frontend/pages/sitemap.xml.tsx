import { GetServerSideProps } from 'next'
import { statSync } from 'fs'
import { join } from 'path'

export default function Sitemap() {
  return null
}

// Function to get file modification date
const getFileModifiedDate = (filePath: string): string => {
  try {
    const stats = statSync(filePath);
    return new Date(stats.mtime).toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = 'https://intrepidq.xyz'
  
  // Define paths to get actual modification dates
  const pagesPath = join(process.cwd(), 'pages');

  const staticPages = [
    { path: '', file: join(pagesPath, 'index.tsx') },
    { path: '/blog', file: join(pagesPath, 'blogs', 'index.mdx') },
    { path: '/privacy-policy', file: join(pagesPath, 'privacy-policy.tsx') },
    { path: '/terms-of-service', file: join(pagesPath, 'terms-of-service.tsx') },
    { path: '/acceptable-use-policy', file: join(pagesPath, 'acceptable-use-policy.tsx') },
    { path: '/docs', file: join(pagesPath, 'docs', 'index.mdx') },
    { path: '/docs/PROJECT_OVERVIEW', file: join(pagesPath, 'docs', 'PROJECT_OVERVIEW.mdx') },
    { path: '/docs/TECHNOLOGY_STACK', file: join(pagesPath, 'docs', 'TECHNOLOGY_STACK.mdx') },
    { path: '/docs/DIRECTORY_STRUCTURE', file: join(pagesPath, 'docs', 'DIRECTORY_STRUCTURE.mdx') },
    { path: '/docs/GETTING_STARTED', file: join(pagesPath, 'docs', 'GETTING_STARTED.mdx') },
    { path: '/docs/FRONTEND_ARCHITECTURE', file: join(pagesPath, 'docs', 'FRONTEND_ARCHITECTURE.mdx') },
    { path: '/docs/BACKEND_ARCHITECTURE', file: join(pagesPath, 'docs', 'BACKEND_ARCHITECTURE.mdx') },
    { path: '/docs/API_REFERENCE', file: join(pagesPath, 'docs', 'API_REFERENCE.mdx') },
    { path: '/docs/DATA_MODELS', file: join(pagesPath, 'docs', 'DATA_MODELS.mdx') },
    { path: '/docs/CORE_FEATURES', file: join(pagesPath, 'docs', 'CORE_FEATURES.mdx') },
    { path: '/docs/DEPLOYMENT_OPERATIONS', file: join(pagesPath, 'docs', 'DEPLOYMENT_OPERATIONS.mdx') },
    { path: '/docs/CONTRIBUTING', file: join(pagesPath, 'docs', 'CONTRIBUTING.mdx') },
    { path: '/docs/CHANGELOG', file: join(pagesPath, 'docs', 'CHANGELOG.mdx') },
    { path: '/dashboard', file: join(pagesPath, 'dashboard.tsx') },
    { path: '/profile', file: join(pagesPath, 'profile.tsx') },
    { path: '/auth/signin', file: join(pagesPath, 'auth', 'signin.tsx') },
    { path: '/blogs/about-intrepidq', file: join(pagesPath, 'blogs', 'about-intrepidq.mdx') },
    { path: '/blogs/how-intrepidq-enhances-upsc-preparation', file: join(pagesPath, 'blogs', 'how-intrepidq-enhances-upsc-preparation.mdx') },
    { path: '/blogs/how-to-actually-prepare-for-upsc-ethics-paper', file: join(pagesPath, 'blogs', 'how-to-actually-prepare-for-upsc-ethics-paper.md') },
    { path: '/blogs/how-to-crack-kpsc-kas-prelims', file: join(pagesPath, 'blogs', 'how-to-crack-kpsc-kas-prelims.md') },
    { path: '/blogs/how-to-easily-crack-upsc-csat', file: join(pagesPath, 'blogs', 'how-to-easily-crack-upsc-csat.md') },
    { path: '/blogs/how-to-prepare-currentaffairs-for-upsc', file: join(pagesPath, 'blogs', 'how-to-prepare-currentaffairs-for-upsc.md') },
    { path: '/blogs/how-to-write-a-fantastic-essay-in-upsc-cse-mains', file: join(pagesPath, 'blogs', 'how-to-write-a-fantastic-essay-in-upsc-cse-mains.md') },
    { path: '/blogs/how-to-write-an-awesome-upsc-cse-mains-general-studies-answer', file: join(pagesPath, 'blogs', 'how-to-write-an-awesome-upsc-cse-mains-general-studies-answer.md') },
    { path: '/blogs/thought-blog', file: join(pagesPath, 'blogs', 'thought-blog.md') },
    { path: '/blogs/webapp-updates-and-new-features', file: join(pagesPath, 'blogs', 'webapp-updates-and-new-features.mdx') }
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map((page) => {
    // Handle the root path correctly
    const loc = page.path === '' ? baseUrl : `${baseUrl}${page.path}`
    const lastmod = getFileModifiedDate(page.file)
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  })
  .join('\n')}
</urlset>`

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}