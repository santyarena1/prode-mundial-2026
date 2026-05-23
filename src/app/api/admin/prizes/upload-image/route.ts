import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { randomUUID } from "crypto";
import { getAdminFromCookies } from "@/lib/cookies";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG, WebP o GIF." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "La imagen no puede superar 8 MB." }, { status: 400 });

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `prizes/${randomUUID()}.${ext}`;

  try {
    const buffer = await file.arrayBuffer();
    const blob = await put(filename, buffer, { access: "public", contentType: file.type });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("Blob upload error:", err);
    return NextResponse.json({ error: "Error al subir la imagen al almacenamiento" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await request.json();
  if (url?.includes("blob.vercel-storage.com")) {
    try { await del(url); } catch { /* already gone */ }
  }
  return NextResponse.json({ ok: true });
}
