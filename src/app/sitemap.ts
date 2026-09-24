import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/seo';

/**
 * Public pages only. `/manage` and `/manage/[token]` are intentionally excluded —
 * they are private, `noindex`, and must never be advertised to search engines.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/services'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/book'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/location'), lastModified, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
