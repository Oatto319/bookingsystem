import { requireUser } from "@/lib/session";
import { buildLogbookFilter } from "@/lib/vehicle-filters";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const params = new URL(request.url).searchParams;
    const filter = buildLogbookFilter(params);
    const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 50);
    const requestedPage = Math.max(Math.floor(Number(params.get("page")) || 1), 1);

    const total = await VehicleBooking.countDocuments(filter);
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(requestedPage, pages);
    const bookings = await VehicleBooking.find(filter)
      .sort({ "departureLog.departedAt": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return Response.json({ bookings, total, page, pages });
  } catch (error) {
    console.error("Failed to load logbook:", error);
    return Response.json({ message: "ไม่สามารถโหลดสมุดบันทึกการเดินทางได้" }, { status: 503 });
  }
}
