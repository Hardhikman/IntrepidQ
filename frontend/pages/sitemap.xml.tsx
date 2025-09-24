import { GetServerSideProps } from 'next'

const Sitemap = () => {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res, req }) => {
  // Use the request host as fallback to ensure correct domain
  const host = req.headers.host || 'intrepidq.xyz'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`

  const staticPages = [
    '',
    '/about',
    '/blog',
    '/privacy-policy',
    '/terms-of-service',
    '/acceptable-use-policy',
    '/docs',
    '/docs/PROJECT_OVERVIEW',
    '/docs/TECHNOLOGY_STACK',
    '/docs/DIRECTORY_STRUCTURE',
    '/docs/GETTING_STARTED',
    '/docs/FRONTEND_ARCHITECTURE',
    '/docs/BACKEND_ARCHITECTURE',
    '/docs/API_REFERENCE',
    '/docs/DATA_MODELS',
    '/docs/CORE_FEATURES',
    '/docs/DEPLOYMENT_OPERATIONS',
    '/docs/CONTRIBUTING',
    '/docs/CHANGELOG'
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map((path) => {
    return `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
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

export default Sitemap
