import { GetServerSideProps } from 'next'

export default function Sitemap() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ res, req }) => {
  const baseUrl = 'https://intrepidq.xyz'

  const staticPages = [
    '',
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
    '/docs/CHANGELOG',
    '/dashboard',
    '/profile',
    '/auth/signin',
    '/blogs/about-intrepidq',
    '/blogs/how-intrepidq-enhances-upsc-preparation',
    '/blogs/how-to-actually-prepare-for-upsc-ethics-paper',
    '/blogs/how-to-crack-kpsc-kas-prelims',
    '/blogs/how-to-easily-crack-upsc-csat',
    '/blogs/how-to-prepare-currentaffairs-for-upsc',
    '/blogs/how-to-write-a-fantastic-essay-in-upsc-cse-mains',
    '/blogs/how-to-write-an-awesome-upsc-cse-mains-general-studies-answer',
    '/blogs/thought-blog',
    '/blogs/webapp-updates-and-new-features'
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map((path) => {
    // Handle the root path correctly
    const loc = path === '' ? baseUrl : `${baseUrl}${path}`
    return `  <url>
    <loc>${loc}</loc>
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