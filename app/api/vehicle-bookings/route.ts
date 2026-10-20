import { requireUser } from "@/lib/session";
import { OfficeVehicle } from "@/models/office-vehicle";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    // หน้าภาพรวม: รายการที่ยังไม่คืนทั้งหมด + 20 รายการล่าสุด + จำนวนทั้งหมด
    // (สมุดเดินทางแบบกรอง/แบ่งหน้าอยู่ที่ /api/vehicle-bookings/logbook)
    const [inUse, recent, total] = await Promise.all([
      VehicleBooking.find({ status: "in_use" }).lean().exec(),
      VehicleBooking.find().sort({ "departureLog.departedAt": -1 }).limit(20).lean().exec(),
      VehicleBooking.estimatedDocumentCount(),
    ]);
    const byId = new Map<string, (typeof recent)[number]>();
    for (const booking of [...recent, ...inUse]) byId.set(String(booking._id), booking);
    const bookings = [...byId.values()].sort(
      (a, b) =>
        new Date(b.departureLog.departedAt).getTime() - new Date(a.departureLog.departedAt).getTime(),
    );
    return Response.json({ bookings, total });
  } catch (error) {
    console.error("Failed to load vehicle bookings:", error);
    return Response.json({ message: "ไม่สามารถโหลดสมุดบันทึกการใช้รถได้" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ message: "ข้อมูลก่อนออกเดินทางไม่ถูกต้อง" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const vehicleCode = text(data.vehicleCode);
    const destination = text(data.destination);
    const driver = text(data.driver);
    const purpose = text(data.purpose);
    const note = text(data.note);
    const departedAt = new Date(text(data.departedAt));
    const expectedRaw = text(data.expectedReturnAt);
    const expectedReturnAt = expectedRaw ? new Date(expectedRaw) : null;
    const startingOdometer = Number(data.startingOdometer);
    const passengers = data.passengers === undefined || data.passengers === "" ? 0 : Number(data.passengers);

    const validOdometer =
      data.startingOdometer !== undefined &&
      data.startingOdometer !== null &&
      data.startingOdometer !== "" &&
      Number.isFinite(startingOdometer) &&
      startingOdometer >= 0;
    if (
      !vehicleCode ||
      !destination ||
      !driver ||
      !purpose ||
      destination.length > 200 ||
      driver.length > 100 ||
      purpose.length > 200 ||
      note.length > 500 ||
      !validOdometer ||
      !Number.isInteger(passengers) ||
      passengers < 0 ||
      Number.isNaN(departedAt.getTime()) ||
      (expectedReturnAt !== null && Number.isNaN(expectedReturnAt.getTime()))
    ) {
      return Response.json(
        { message: "กรุณากรอกข้อมูลก่อนออกเดินทางให้ครบถ้วนและถูกต้อง" },
        { status: 400 },
      );
    }
    if (expectedReturnAt && expectedReturnAt <= departedAt) {
      return Response.json({ message: "เวลาที่คาดว่าจะกลับต้องหลังเวลาออกเดินทาง" }, { status: 400 });
    }

    const vehicle = await OfficeVehicle.findOne({ code: vehicleCode, active: true }).lean().exec();
    if (!vehicle) return Response.json({ message: "ไม่พบรถสำนักงานที่เลือก" }, { status: 404 });
    if (passengers > vehicle.seats) {
      return Response.json({ message: `รถคันนี้รองรับผู้โดยสารได้ไม่เกิน ${vehicle.seats} คน` }, { status: 400 });
    }

    if (await VehicleBooking.exists({ vehicleCode, status: "in_use" })) {
      return Response.json({ message: "รถคันนี้กำลังถูกใช้งาน กรุณาเลือกคันอื่น" }, { status: 409 });
    }

    const booking = await VehicleBooking.create({
      vehicleCode,
      vehicleName: vehicle.name,
      registration: vehicle.registration,
      createdBy: auth.user.username,
      departureLog: {
        departedAt,
        requester: auth.user.displayName,
        destination,
        startingOdometer,
        driver,
        purpose,
        passengers,
        expectedReturnAt,
        note,
      },
      status: "in_use",
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return Response.json({ message: "รถคันนี้กำลังถูกใช้งาน กรุณาเลือกคันอื่น" }, { status: 409 });
    }
    console.error("Failed to create vehicle departure log:", error);
    return Response.json({ message: "บันทึกข้อมูลก่อนออกเดินทางไม่สำเร็จ" }, { status: 503 });
  }
}
