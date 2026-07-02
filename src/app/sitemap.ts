import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ironlock.xyz";
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/launch`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/scan`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
