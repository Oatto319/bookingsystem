import { connectToDatabase } from "@/lib/mongodb";
import { defaultRooms, defaultVehicles } from "@/lib/default-catalog";
import { hashPassword } from "@/lib/password";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";
import { User } from "@/models/user";

let seeding: Promise<void> | null = null;

export function ensureDefaultCatalog() {
  seeding ??= seedDefaultCatalog().catch((error: unknown) => {
    seeding = null; // ลองใหม่ได้ถ้าเชื่อมต่อฐานข้อมูลไม่สำเร็จ
    throw error;
  });
  return seeding;
}

export async function seedDefaultCatalog() {
  await connectToDatabase();

  await Promise.all([
    ...defaultRooms.map((room) =>
      MeetingRoom.updateOne({ code: room.code }, { $setOnInsert: room }, { upsert: true }),
    ),
    ...defaultVehicles.map((vehicle) =>
      OfficeVehicle.updateOne({ code: vehicle.code }, { $setOnInsert: vehicle }, { upsert: true }),
    ),
  ]);
  await ensureInitialAdmin();
}

/** สร้างผู้ดูแลระบบคนแรกเมื่อยังไม่มีผู้ใช้เลย (ตั้งค่าผ่าน ADMIN_USERNAME / ADMIN_PASSWORD) */
async function ensureInitialAdmin() {
  if ((await User.estimatedDocumentCount()) > 0) return;
  const production = process.env.NODE_ENV === "production";
  const username = (process.env.ADMIN_USERNAME ?? (production ? "" : "admin")).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? (production ? "" : "admin1234");
  if (!username || password.length < 8) {
    console.warn("ยังไม่มีผู้ใช้ในระบบ: ตั้งค่า ADMIN_USERNAME และ ADMIN_PASSWORD (อย่างน้อย 8 ตัวอักษร) เพื่อสร้างผู้ดูแลระบบ");
    return;
  }
  await User.updateOne(
    { username },
    {
      $setOnInsert: {
        username,
        displayName: "ผู้ดูแลระบบ",
        role: "admin",
        passwordHash: hashPassword(password),
        active: true,
      },
    },
    { upsert: true },
  );
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`สร้างผู้ดูแลระบบเริ่มต้น "${username}" ด้วยรหัสผ่านตัวอย่าง กรุณาเปลี่ยนรหัสผ่านทันที`);
  }
}
