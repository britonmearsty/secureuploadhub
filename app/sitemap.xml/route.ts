import prisma from '@/lib/prisma';

export async function GET() {
  const baseUrl = 'https://secureuploadhub.com';
  
  try {
    // Get all public portals
    const portals = await prisma.uploadPortal.findMany({
      where: { 
        isActive: true,
        // Only include public portals (not password protected)
        passwordHash: null
      },
      select: { slug: true, updatedAt: true }
    });

    const urls = [
      { url: baseUrl, lastModified: new Date(), priority: 1.0 },
      { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.8 },
      { url: `${baseUrl}/security`, lastModified: new Date(), priority: 0.8 },
      { url: `${baseUrl}/terms`, lastModified: new Date(), priority: 0.6 },
      { url: `${baseUrl}/cookie-policy`, lastModified: new Date(), priority: 0.6 },
      { url: `${baseUrl}/gdpr`, lastModified: new Date(), priority: 0.6 },
      // Add profession-specific pages
      { url: `${baseUrl}/for-accountants`, lastModified: new Date(), priority: 0.9 },
      { url: `${baseUrl}/for-lawyers`, lastModified: new Date(), priority: 0.9 },
      { url: `${baseUrl}/for-agencies`, lastModified: new Date(), priority: 0.9 },
      { url: `${baseUrl}/for-consultants`, lastModified: new Date(), priority: 0.9 },
      ...portals.map(portal => ({
        url: `${baseUrl}/p/${portal.slug}`,
        lastModified: portal.updatedAt,
        priority: 0.7
      }))
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ url, lastModified, priority }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified.toISOString()}</lastmod>
    <priority>${priority}</priority>
  </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
      headers: { 'Content-Type': 'application/xml' }
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Fallback sitemap with static pages only
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/security</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>0.6</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}