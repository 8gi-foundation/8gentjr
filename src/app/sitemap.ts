import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://8gentjr.com'

  return [
    { url: base, lastModified: new Date('2026-04-01') },
    { url: `${base}/aac`, lastModified: new Date('2026-04-01') },
    { url: `${base}/symbols`, lastModified: new Date('2026-04-01') },
    { url: `${base}/speech`, lastModified: new Date('2026-04-01') },
    { url: `${base}/stories`, lastModified: new Date('2026-04-01') },
    { url: `${base}/music`, lastModified: new Date('2026-04-01') },
    { url: `${base}/science`, lastModified: new Date('2026-04-01') },
    { url: `${base}/games`, lastModified: new Date('2026-04-01') },
    { url: `${base}/draw`, lastModified: new Date('2026-04-01') },
    { url: `${base}/intuition`, lastModified: new Date('2026-04-01') },
    { url: `${base}/talk`, lastModified: new Date('2026-04-01') },
    { url: `${base}/suggestions`, lastModified: new Date('2026-04-01') },
    { url: `${base}/privacy`, lastModified: new Date('2026-04-01') },
    { url: `${base}/terms`, lastModified: new Date('2026-04-01') },
    { url: `${base}/feedback`, lastModified: new Date('2026-04-21') },
  ]
}
