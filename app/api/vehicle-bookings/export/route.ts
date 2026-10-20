import { requireUser } from "@/lib/session";
import { buildLogbookFilter } from "@/lib/vehicle-filters";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

const fmt = (value: Date | string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Bangkok",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

// ป้องกัน CSV/Excel formula injection และ escape เครื่องหมายคำพูด
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const filter = buildLogbookFilter(new URL(request.url).searchParams);
    const bookings = await VehicleBooking.find(filter)
      .sort({ "departureLog.departedAt": -1 })
      .limit(5000)
      .lean()
      .exec();

    const header = [
      "รถ", "ทะเบียน", "ผู้ขอใช้", "พนักงานขับรถ", "ปลายทาง", "วัตถุประสงค์", "ผู้โดยสาร",
      "วันเวลาออก", "คาดว่าจะกลับ", "วันเวลากลับ", "ไมล์เริ่มต้น", "ไมล์สิ้นสุด", "ระยะทาง (กม.)",
      "น้ำมัน (ลิตร)", "ค่าน้ำมัน (บาท)", "สถานะ", "หมายเหตุ",
    ];
    const rows = bookings.map((b) => [
      b.vehicleName, b.registration, b.departureLog.requester, b.departureLog.driver,
      b.departureLog.destination, b.departureLog.purpose, b.departureLog.passengers,
      fmt(b.departureLog.departedAt), fmt(b.departureLog.expectedReturnAt), fmt(b.returnLog?.returnedAt),
      b.departureLog.startingOdometer, b.returnLog?.endingOdometer, b.totalDistance,
      b.returnLog?.fuelLiters, b.returnLog?.fuelCost,
      b.status === "in_use" ? "กำลังเดินทาง" : "กลับถึงแล้ว", b.departureLog.note,
    ]);
    // BOM ทำให้ Excel อ่านภาษาไทยถูกต้อง
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vehicle-logbook-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export logbook:", error);
    return Response.json({ message: "ส่งออกข้อมูลไม่สำเร็จ" }, { status: 503 });
  }
}
