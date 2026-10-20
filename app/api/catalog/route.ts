import { requireUser } from "@/lib/session";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    // ผู้ดูแลระบบขอดูรายการที่ปิดใช้งานด้วยได้ (?all=1)
    const includeInactive =
      auth.user.role === "admin" && new URL(request.url).searchParams.get("all") === "1";
    const filter = includeInactive ? {} : { active: true };

    const [rooms, vehicles, lastTrips] = await Promise.all([
      MeetingRoom.find(filter).sort({ name: 1 }).lean().exec(),
      OfficeVehicle.find(filter).sort({ name: 1 }).lean().exec(),
      // ทริปล่าสุดของรถแต่ละคัน เพื่อเติมเลขไมล์เริ่มต้นให้อัตโนมัติ
      VehicleBooking.aggregate([
        { $sort: { "departureLog.departedAt": -1 } },
        {
          $group: {
            _id: "$vehicleCode",
            status: { $first: "$status" },
            start: { $first: "$departureLog.startingOdometer" },
            end: { $first: "$returnLog.endingOdometer" },
          },
        },
      ]),
    ]);

    const odometerByVehicle = new Map<string, number>(
      lastTrips.map((trip: { _id: string; status: string; start: number; end?: number }) => [
        trip._id,
        trip.status === "returned" && typeof trip.end === "number" ? trip.end : trip.start,
      ]),
    );

    return Response.json({
      rooms,
      vehicles: vehicles.map((vehicle) => ({
        ...vehicle,
        lastOdometer: odometerByVehicle.get(vehicle.code) ?? null,
      })),
    });
  } catch (error) {
    console.error("Failed to load booking catalog:", error);
    return Response.json(
      { message: "ไม่สามารถโหลดรายการห้องประชุมและรถได้ กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล" },
      { status: 503 },
    );
  }
}
