import { requireUser } from "@/lib/session";
import { thaiMonthRange } from "@/lib/vehicle-filters";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const month = new URL(request.url).searchParams.get("month") ?? "";
    const range = thaiMonthRange(month);
    if (!range) return Response.json({ message: "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)" }, { status: 400 });

    const rows = await VehicleBooking.aggregate([
      { $match: { "departureLog.departedAt": { $gte: range.start, $lt: range.end } } },
      {
        $group: {
          _id: "$vehicleCode",
          vehicleName: { $first: "$vehicleName" },
          registration: { $first: "$registration" },
          trips: { $sum: 1 },
          distance: { $sum: { $ifNull: ["$totalDistance", 0] } },
          fuelLiters: { $sum: { $ifNull: ["$returnLog.fuelLiters", 0] } },
          fuelCost: { $sum: { $ifNull: ["$returnLog.fuelCost", 0] } },
        },
      },
      { $sort: { vehicleName: 1 } },
    ]);
    const summary = rows.map((row) => ({
      vehicleCode: row._id,
      vehicleName: row.vehicleName,
      registration: row.registration,
      trips: row.trips,
      distance: Math.round(row.distance * 10) / 10,
      fuelLiters: Math.round(row.fuelLiters * 100) / 100,
      fuelCost: Math.round(row.fuelCost * 100) / 100,
    }));
    return Response.json({ month, summary });
  } catch (error) {
    console.error("Failed to build summary:", error);
    return Response.json({ message: "สรุปข้อมูลไม่สำเร็จ" }, { status: 503 });
  }
}
