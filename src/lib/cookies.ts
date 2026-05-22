import { cookies } from "next/headers";
import { verifyUserToken, verifyAdminToken } from "./auth";
import { sessionMaxAgeSeconds } from "./session";

export const USER_COOKIE = "user_token";
export const ADMIN_COOKIE = "admin_token";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: sessionMaxAgeSeconds(),
  path: "/",
};

export async function getUserFromCookies(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE)?.value;
  if (!token) return null;
  return verifyUserToken(token);
}

export async function getAdminFromCookies(): Promise<{ adminId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
