import { ensureDefaultCatalog } from "@/lib/catalog";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { setSessionCookie, toSessionUser } from "@/lib/session";
import { User } from "@/models/user";

export async function POST(request: Request) {
  try {
    await ensureDefaultCatalog();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!username || !password) {
      return Response.json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const key = `${ip}:${username}`;
    if (isRateLimited(key)) {
      return Response.json(
        { message: "ลองเข้าสู่ระบบผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่" },
        { status: 429 },
      );
    }

    const user = await User.findOne({ username, active: true }).lean().exec();
    const valid = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) {
      recordFailure(key);
      return Response.json({ message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    clearFailures(key);
    await setSessionCookie(user.username, user.passwordHash);
    return Response.json({ user: toSessionUser(user) });
  } catch (error) {
    console.error("Login failed:", error);
    return Response.json({ message: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่" }, { status: 503 });
  }
}
