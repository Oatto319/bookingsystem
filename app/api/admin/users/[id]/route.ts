import { isValidObjectId } from "mongoose";
import { hashPassword } from "@/lib/password";
import { requireUser, toSessionUser } from "@/lib/session";
import { User } from "@/models/user";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireUser({ admin: true });
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) return Response.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (typeof body.displayName === "string") {
      const name = body.displayName.trim();
      if (!name || name.length > 100) return Response.json({ message: "ชื่อไม่ถูกต้อง" }, { status: 400 });
      update.displayName = name;
    }
    if (typeof body.department === "string") update.department = body.department.trim().slice(0, 100);
    if (body.role === "admin" || body.role === "user") update.role = body.role;
    if (typeof body.active === "boolean") update.active = body.active;
    if (typeof body.password === "string" && body.password) {
      if (body.password.length < 8 || body.password.length > 100) {
        return Response.json({ message: "รหัสผ่านต้องมีความยาว 8-100 ตัวอักษร" }, { status: 400 });
      }
      update.passwordHash = hashPassword(body.password);
    }

    // กันผู้ดูแลล็อกตัวเองออกจากระบบ
    if (id === auth.user.id && (update.active === false || update.role === "user")) {
      return Response.json(
        { message: "ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตัวเองได้" },
        { status: 400 },
      );
    }

    const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!user) return Response.json({ message: "ไม่พบผู้ใช้" }, { status: 404 });
    return Response.json({ user: { ...toSessionUser(user), active: user.active } });
  } catch (error) {
    console.error("Failed to update user:", error);
    return Response.json({ message: "แก้ไขผู้ใช้ไม่สำเร็จ" }, { status: 503 });
  }
}
