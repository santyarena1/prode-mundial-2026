import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";
import sharp from "sharp";

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

async function stripLightBackground(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 235 && g > 235 && b > 235) {
      data[i + 3] = 0;
    } else if (r > 210 && g > 210 && b > 210) {
      data[i + 3] = Math.min(data[i + 3], 80);
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export async function saveSponsorLogo(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Usá JPG, PNG, WebP, GIF o SVG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 2 MB.");
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  if (file.type !== "image/svg+xml") {
    buffer = Buffer.from(await stripLightBackground(buffer));
  }

  const filename = `sponsors/${randomUUID()}.png`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/png",
  });

  return blob.url;
}

export async function deleteSponsorLogoFile(logoUrl: string | null | undefined): Promise<void> {
  if (!logoUrl) return;
  // Only delete Blob-hosted URLs (not legacy local paths)
  if (logoUrl.startsWith("https://") && logoUrl.includes("blob.vercel-storage.com")) {
    try {
      await del(logoUrl);
    } catch {
      // already deleted or not found
    }
  }
}
