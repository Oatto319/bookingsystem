import { hashPassword } from "@/lib/password";
import { requireUser, toSessionUser } from "@/lib/session";
import { User } from "@/models/user";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const auth = await requireUser({ admin: true });
  if (auth.response) return auth.response;
  try {
    const users = await User.find().sort({ username: 1 }).lean().exec();
    return Response.json({ users: users.map((u) => ({ ...toSessionUser(u), active: u.active })) });
  } catch (error) {
    console.error("Failed to load users:", error);
    return Response.json({ message: "โหลดรายชื่อผู้ใช้ไม่สำเร็จ" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser({ admin: true });
  if (auth.response) return auth.response;
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const department = typeof body?.department === "string" ? body.department.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role === "admin" ? "admin" : "user";
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      return Response.json(
        { message: "ชื่อผู้ใช้ต้องเป็น a-z 0-9 . _ - ความยาว 3-50 ตัวอักษร" },
        { status: 400 },
      );
    }
    if (!displayName || displayName.length > 100 || department.length > 100) {
      return Response.json({ message: "กรุณาระบุชื่อ-นามสกุลให้ถูกต้อง" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 100) {
      return Response.json({ message: "รหัสผ่านต้องมีความยาว 8-100 ตัวอักษร" }, { status: 400 });
    }
    const user = await User.create({ username, displayName, department, role, passwordHash: hashPassword(password) });
    return Response.json({ user: { ...toSessionUser(user), active: user.active } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return Response.json({ message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" }, { status: 409 });
    }
    console.error("Failed to create user:", error);
    return Response.json({ message: "สร้างผู้ใช้ไม่สำเร็จ" }, { status: 503 });
  }
}
