import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://killsub.vercel.app', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://killsub.vercel.app/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://killsub.vercel.app/register', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  ]
}
