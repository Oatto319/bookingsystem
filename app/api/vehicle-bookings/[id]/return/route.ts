import { isValidObjectId } from "mongoose";
import { ensureDefaultCatalog } from "@/lib/catalog";
import { VehicleBooking } from "@/models/vehicle-booking";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await ensureDefaultCatalog();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return Response.json({ message: "ไม่พบรายการใช้รถที่ต้องการ" }, { status: 404 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ message: "ข้อมูลเมื่อกลับถึงหน่วยงานไม่ถูกต้อง" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const returnedAt = new Date(typeof data.returnedAt === "string" ? data.returnedAt : "");
    const endingOdometer = Number(data.endingOdometer);
    if (
      Number.isNaN(returnedAt.getTime()) ||
      data.endingOdometer === undefined ||
      data.endingOdometer === null ||
      data.endingOdometer === "" ||
      !Number.isFinite(endingOdometer) ||
      endingOdometer < 0
    ) {
      return Response.json(
        { message: "กรุณาระบุวันเวลากลับและเลขไมล์สิ้นสุดให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const existing = await VehicleBooking.findOne({ _id: id, status: "in_use" })
      .lean()
      .exec();
    if (!existing) {
      return Response.json(
        { message: "รายการนี้ถูกปิดการใช้งานแล้ว หรือไม่พบรายการ" },
        { status: 409 },
      );
    }
    if (returnedAt < existing.departureLog.departedAt) {
      return Response.json(
        { message: "วันเวลากลับต้องไม่ก่อนวันเวลาออกเดินทาง" },
        { status: 400 },
      );
    }
    if (endingOdometer < existing.departureLog.startingOdometer) {
      return Response.json(
        { message: "เลขไมล์สิ้นสุดต้องไม่น้อยกว่าเลขไมล์เริ่มต้น" },
        { status: 400 },
      );
    }

    const totalDistance =
      Math.round((endingOdometer - existing.departureLog.startingOdometer) * 10) / 10;
    const booking = await VehicleBooking.findOneAndUpdate(
      { _id: id, status: "in_use", returnLog: null },
      {
        $set: {
          returnLog: { returnedAt, endingOdometer },
          totalDistance,
          status: "returned",
        },
      },
      { new: true, runValidators: true },
    ).exec();

    if (!booking) {
      return Response.json(
        { message: "รายการนี้ถูกบันทึกการกลับแล้ว กรุณาโหลดข้อมูลใหม่" },
        { status: 409 },
      );
    }

    return Response.json({ booking });
  } catch (error) {
    console.error("Failed to save vehicle return log:", error);
    return Response.json({ message: "บันทึกข้อมูลเมื่อกลับถึงหน่วยงานไม่สำเร็จ" }, { status: 503 });
  }
}
