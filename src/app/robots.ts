import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Staff routes, guest order links and the demo checkout are never
      // indexed. A magic-link order page in a search result is a leak.
      disallow: ['/portal/', '/admin/', '/api/', '/es/pedido/', '/en/pedido/'],
    },
    sitemap: `${BASE}/sitemap.xml`,
  }
}
