import { NextResponse } from "next/server";
import { USER_COOKIE, COOKIE_OPTIONS } from "@/lib/cookies";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(USER_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
