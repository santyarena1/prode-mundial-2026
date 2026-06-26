import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://thegamershop-premios.com";
  return [
    { url: base,                  lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/ranking`,     lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/prizes`,      lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${base}/como-jugar`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/fixture-live`,lastModified: new Date(), changeFrequency: "daily",   priority: 0.7 },
    { url: `${base}/register`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/login`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contacto`,    lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
