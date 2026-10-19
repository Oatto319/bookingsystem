import { ensureDefaultCatalog } from "@/lib/catalog";
import { OfficeVehicle } from "@/models/office-vehicle";
import { VehicleBooking } from "@/models/vehicle-booking";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    await ensureDefaultCatalog();
    const bookings = await VehicleBooking.find()
      .sort({ "departureLog.departedAt": -1 })
      .limit(50)
      .lean()
      .exec();
    return Response.json({ bookings });
  } catch (error) {
    console.error("Failed to load vehicle bookings:", error);
    return Response.json({ message: "ไม่สามารถโหลดสมุดบันทึกการใช้รถได้" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDefaultCatalog();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ message: "ข้อมูลก่อนออกเดินทางไม่ถูกต้อง" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const vehicleCode = typeof data.vehicleCode === "string" ? data.vehicleCode : "";
    const requester = typeof data.requester === "string" ? data.requester.trim() : "";
    const destination = typeof data.destination === "string" ? data.destination.trim() : "";
    const driver = typeof data.driver === "string" ? data.driver.trim() : "";
    const note = typeof data.note === "string" ? data.note.trim() : "";
    const departedAt = new Date(typeof data.departedAt === "string" ? data.departedAt : "");
    const startingOdometer = Number(data.startingOdometer);

    if (
      !vehicleCode ||
      !requester ||
      !destination ||
      !driver ||
      requester.length > 100 ||
      destination.length > 200 ||
      driver.length > 100 ||
      note.length > 500 ||
      data.startingOdometer === undefined ||
      data.startingOdometer === null ||
      data.startingOdometer === "" ||
      !Number.isFinite(startingOdometer) ||
      startingOdometer < 0 ||
      Number.isNaN(departedAt.getTime())
    ) {
      return Response.json(
        { message: "กรุณากรอกข้อมูลก่อนออกเดินทางให้ครบถ้วนและถูกต้อง" },
        { status: 400 },
      );
    }

    const vehicle = await OfficeVehicle.findOne({
      code: vehicleCode,
      active: true,
    }).lean().exec();
    if (!vehicle) {
      return Response.json({ message: "ไม่พบรถสำนักงานที่เลือก" }, { status: 404 });
    }

    const vehicleInUse = await VehicleBooking.exists({ vehicleCode, status: "in_use" });
    if (vehicleInUse) {
      return Response.json(
        { message: "รถคันนี้กำลังถูกใช้งาน กรุณาเลือกคันอื่น" },
        { status: 409 },
      );
    }

    const booking = await VehicleBooking.create({
      vehicleCode,
      vehicleName: vehicle.name,
      registration: vehicle.registration,
      departureLog: {
        departedAt,
        requester,
        destination,
        startingOdometer,
        driver,
        note,
      },
      status: "in_use",
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create vehicle departure log:", error);
    return Response.json({ message: "บันทึกข้อมูลก่อนออกเดินทางไม่สำเร็จ" }, { status: 503 });
  }
}
