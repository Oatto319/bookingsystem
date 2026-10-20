import { hashPassword, verifyPassword } from "@/lib/password";
import { requireUser, setSessionCookie } from "@/lib/session";
import { User } from "@/models/user";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (next.length < 8 || next.length > 100) {
      return Response.json({ message: "รหัสผ่านใหม่ต้องมีความยาว 8-100 ตัวอักษร" }, { status: 400 });
    }
    const user = await User.findOne({ username: auth.user.username }).exec();
    if (!user || !verifyPassword(current, user.passwordHash)) {
      return Response.json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
    }
    user.passwordHash = hashPassword(next);
    await user.save();
    await setSessionCookie(user.username, user.passwordHash); // ออก session ใหม่ให้เครื่องนี้
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    return Response.json({ message: "เปลี่ยนรหัสผ่านไม่สำเร็จ" }, { status: 503 });
  }
}
