export async function GET() {
  return new Response(`User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /auth/

Sitemap: https://secureuploadhub.com/sitemap.xml`, {
    headers: { 'Content-Type': 'text/plain' }
  });
}