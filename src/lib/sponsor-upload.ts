import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export async function saveSponsorLogo(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Formato no permitido. Usá JPG, PNG, WebP, GIF o SVG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 2 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "image/svg+xml" ? "svg" : file.name.split(".").pop() || "png";
  const filename = `sponsors/${randomUUID()}.${ext}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: file.type,
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
