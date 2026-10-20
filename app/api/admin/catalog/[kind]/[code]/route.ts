import { parseCatalogItem } from "@/lib/catalog-input";
import { requireUser } from "@/lib/session";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";
import { VehicleBooking } from "@/models/vehicle-booking";

type RouteContext = { params: Promise<{ kind: string; code: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireUser({ admin: true });
  if (auth.response) return auth.response;
  try {
    const { kind, code } = await params;
    if (kind !== "rooms" && kind !== "vehicles") {
      return Response.json({ message: "ไม่พบประเภทข้อมูล" }, { status: 404 });
    }
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (typeof body.active === "boolean") update.active = body.active;
    if (Object.keys(body).some((key) => key !== "active")) {
      const parsed = parseCatalogItem(kind, body, { requireCode: false });
      if (!parsed.ok) return Response.json({ message: parsed.message }, { status: 400 });
      Object.assign(update, parsed.value);
    }
    delete update.code; // รหัสอ้างอิงจากการจองเดิม จึงไม่ให้เปลี่ยน

    if (kind === "vehicles" && update.active === false) {
      const inUse = await VehicleBooking.exists({ vehicleCode: code, status: "in_use" });
      if (inUse) {
        return Response.json(
          { message: "รถคันนี้กำลังถูกใช้งาน ไม่สามารถปิดใช้งานได้จนกว่าจะบันทึกขากลับ" },
          { status: 409 },
        );
      }
    }

    const model = kind === "rooms" ? MeetingRoom : OfficeVehicle;
    const item = await model.findOneAndUpdate({ code }, { $set: update }, { new: true, runValidators: true })
      .lean()
      .exec();
    if (!item) return Response.json({ message: "ไม่พบรายการที่ต้องการ" }, { status: 404 });
    return Response.json({ item });
  } catch (error) {
    console.error("Failed to update catalog item:", error);
    return Response.json({ message: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 503 });
  }
}
