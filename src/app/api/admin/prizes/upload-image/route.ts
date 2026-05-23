import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { getAdminFromCookies } from "@/lib/cookies";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ["image/webp", "image/jpeg", "image/png", "image/gif"],
        pathname: `prizes/${pathname}`,
        maximumSizeInBytes: 20 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
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
