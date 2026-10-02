import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/dashboard' },
    sitemap: 'https://killsub.vercel.app/sitemap.xml',
  }
}
