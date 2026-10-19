import { ensureDefaultCatalog } from "@/lib/catalog";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    await ensureDefaultCatalog();
    const [rooms, vehicles] = await Promise.all([
      MeetingRoom.find({ active: true }).sort({ name: 1 }).lean().exec(),
      OfficeVehicle.find({ active: true }).sort({ name: 1 }).lean().exec(),
    ]);

    return Response.json({ rooms, vehicles });
  } catch (error) {
    console.error("Failed to load booking catalog:", error);
    return Response.json(
      { message: "ไม่สามารถโหลดรายการห้องประชุมและรถได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล" },
      { status: 503 },
    );
  }
}
