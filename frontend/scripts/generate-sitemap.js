const fs = require('fs');
const path = require('path');

// Generate sitemap during build process
const baseUrl = 'https://intrepidq.xyz'

// Define paths to get actual modification dates
const pagesPath = path.join(process.cwd(), 'pages');

// Function to get file modification date
const getFileModifiedDate = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return new Date(stats.mtime).toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

const staticPages = [
  { path: '', file: path.join(pagesPath, 'index.tsx') },
  { path: '/blogs', file: path.join(pagesPath, 'blogs', 'index.mdx') },
  { path: '/privacy-policy', file: path.join(pagesPath, 'privacy-policy.tsx') },
  { path: '/terms-of-service', file: path.join(pagesPath, 'terms-of-service.tsx') },
  { path: '/acceptable-use-policy', file: path.join(pagesPath, 'acceptable-use-policy.tsx') },
  { path: '/docs', file: path.join(pagesPath, 'docs', 'index.mdx') },
  { path: '/docs/PROJECT_OVERVIEW', file: path.join(pagesPath, 'docs', 'PROJECT_OVERVIEW.mdx') },
  { path: '/docs/TECHNOLOGY_STACK', file: path.join(pagesPath, 'docs', 'TECHNOLOGY_STACK.mdx') },
  { path: '/docs/DIRECTORY_STRUCTURE', file: path.join(pagesPath, 'docs', 'DIRECTORY_STRUCTURE.mdx') },
  { path: '/docs/GETTING_STARTED', file: path.join(pagesPath, 'docs', 'GETTING_STARTED.mdx') },
  { path: '/docs/FRONTEND_ARCHITECTURE', file: path.join(pagesPath, 'docs', 'FRONTEND_ARCHITECTURE.mdx') },
  { path: '/docs/BACKEND_ARCHITECTURE', file: path.join(pagesPath, 'docs', 'BACKEND_ARCHITECTURE.mdx') },
  { path: '/docs/API_REFERENCE', file: path.join(pagesPath, 'docs', 'API_REFERENCE.mdx') },
  { path: '/docs/DATA_MODELS', file: path.join(pagesPath, 'docs', 'DATA_MODELS.mdx') },
  { path: '/docs/CORE_FEATURES', file: path.join(pagesPath, 'docs', 'CORE_FEATURES.mdx') },
  { path: '/docs/DEPLOYMENT_OPERATIONS', file: path.join(pagesPath, 'docs', 'DEPLOYMENT_OPERATIONS.mdx') },
  { path: '/docs/CONTRIBUTING', file: path.join(pagesPath, 'docs', 'CONTRIBUTING.mdx') },
  { path: '/docs/CHANGELOG', file: path.join(pagesPath, 'docs', 'CHANGELOG.mdx') },
  { path: '/dashboard', file: path.join(pagesPath, 'dashboard.tsx') },
  { path: '/profile', file: path.join(pagesPath, 'profile.tsx') },
  { path: '/auth/signin', file: path.join(pagesPath, 'auth', 'signin.tsx') },
  { path: '/blogs/about-intrepidq', file: path.join(pagesPath, 'blogs', 'about-intrepidq.mdx') },
  { path: '/blogs/how-intrepidq-enhances-upsc-preparation', file: path.join(pagesPath, 'blogs', 'how-intrepidq-enhances-upsc-preparation.mdx') },
  { path: '/blogs/how-to-actually-prepare-for-upsc-ethics-paper', file: path.join(pagesPath, 'blogs', 'how-to-actually-prepare-for-upsc-ethics-paper.md') },
  { path: '/blogs/how-to-crack-kpsc-kas-prelims', file: path.join(pagesPath, 'blogs', 'how-to-crack-kpsc-kas-prelims.md') },
  { path: '/blogs/how-to-easily-crack-upsc-csat', file: path.join(pagesPath, 'blogs', 'how-to-easily-crack-upsc-csat.md') },
  { path: '/blogs/how-to-prepare-currentaffairs-for-upsc', file: path.join(pagesPath, 'blogs', 'how-to-prepare-currentaffairs-for-upsc.md') },
  { path: '/blogs/how-to-write-a-fantastic-essay-in-upsc-cse-mains', file: path.join(pagesPath, 'blogs', 'how-to-write-a-fantastic-essay-in-upsc-cse-mains.md') },
  { path: '/blogs/how-to-write-an-awesome-upsc-cse-mains-general-studies-answer', file: path.join(pagesPath, 'blogs', 'how-to-write-an-awesome-upsc-cse-mains-general-studies-answer.md') },
  { path: '/blogs/thought-blog', file: path.join(pagesPath, 'blogs', 'thought-blog.md') },
  { path: '/blogs/webapp-updates-and-new-features', file: path.join(pagesPath, 'blogs', 'webapp-updates-and-new-features.mdx') }
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

// Write sitemap to public directory
const publicDir = path.join(process.cwd(), 'public');
const sitemapPath = path.join(publicDir, 'sitemap.xml');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write sitemap file
fs.writeFileSync(sitemapPath, sitemap);

console.log(`Sitemap generated at ${sitemapPath}`);