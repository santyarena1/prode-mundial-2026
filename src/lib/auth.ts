import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_in_production";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "dev_admin_jwt_secret_change_in_production";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export function signUserToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyUserToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export function signAdminToken(adminId: string): string {
  return jwt.sign({ adminId }, ADMIN_JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
}

export function verifyAdminToken(token: string): { adminId: string } | null {
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string };
    return { adminId: payload.adminId };
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
