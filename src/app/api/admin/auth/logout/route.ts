import { NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_OPTIONS } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
