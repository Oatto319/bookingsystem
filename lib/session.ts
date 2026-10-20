import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureDefaultCatalog } from "@/lib/catalog";
import { User } from "@/models/user";
import type { SessionUser } from "@/types/booking";

export const SESSION_COOKIE = "booking_session";
const SESSION_HOURS = 12;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (อย่างน้อย 16 ตัวอักษร) ยังไม่ได้ตั้งค่า");
  }
  return "dev-only-insecure-session-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const fingerprint = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("hex").slice(0, 12);

export function createSessionToken(username: string, passwordHash: string) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, h: fingerprint(passwordHash), exp: Date.now() + SESSION_HOURS * 3_600_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function setSessionCookie(username: string, passwordHash: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(username, passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function toSessionUser(user: {
  _id: unknown;
  username: string;
  displayName: string;
  role: "admin" | "user";
  department?: string;
}): SessionUser {
  return {
    id: String(user._id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    department: user.department ?? "",
  };
}

async function readSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let data: { u?: string; h?: string; exp?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!data.u || !data.exp || data.exp < Date.now()) return null;

  const user = await User.findOne({ username: data.u, active: true }).lean().exec();
  // เปลี่ยนรหัสผ่านแล้ว session เดิมต้องหมดอายุ
  if (!user || fingerprint(user.passwordHash) !== data.h) return null;
  return toSessionUser(user);
}

type AuthResult = { user: SessionUser; response?: undefined } | { user?: undefined; response: Response };

/** ตรวจว่าผู้เรียกล็อกอินอยู่ (และเป็นผู้ดูแลระบบถ้าระบุ admin) */
export async function requireUser(options: { admin?: boolean } = {}): Promise<AuthResult> {
  try {
    await ensureDefaultCatalog();
    const user = await readSessionUser();
    if (!user) {
      return { response: Response.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
    }
    if (options.admin && user.role !== "admin") {
      return { response: Response.json({ message: "ต้องเป็นผู้ดูแลระบบเท่านั้น" }, { status: 403 }) };
    }
    return { user };
  } catch (error) {
    console.error("Failed to verify session:", error);
    return {
      response: Response.json(
        { message: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่" },
        { status: 503 },
      ),
    };
  }
}
