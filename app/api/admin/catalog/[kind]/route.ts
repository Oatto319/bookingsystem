import { randomBytes } from "node:crypto";
import { parseCatalogItem } from "@/lib/catalog-input";
import { requireUser } from "@/lib/session";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";

type RouteContext = { params: Promise<{ kind: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await requireUser({ admin: true });
  if (auth.response) return auth.response;
  try {
    const { kind } = await params;
    if (kind !== "rooms" && kind !== "vehicles") {
      return Response.json({ message: "ไม่พบประเภทข้อมูล" }, { status: 404 });
    }
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    // ถ้า admin ไม่กรอกรหัส ให้สร้างรหัสอัตโนมัติ (เช่น room-k3x9a2 / car-k3x9a2)
    if (body && !(typeof body.code === "string" && body.code.trim())) {
      body.code = `${kind === "rooms" ? "room" : "car"}-${randomBytes(4).toString("hex")}`;
    }
    const parsed = parseCatalogItem(kind, body, { requireCode: true });
    if (!parsed.ok) return Response.json({ message: parsed.message }, { status: 400 });

    if (kind === "vehicles") {
      const duplicate = await OfficeVehicle.exists({ registration: parsed.value.registration });
      if (duplicate) {
        return Response.json({ message: "ทะเบียนรถนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
      }
    }

    const model = kind === "rooms" ? MeetingRoom : OfficeVehicle;
    const item = await model.create(parsed.value);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return Response.json({ message: "รหัสนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น" }, { status: 409 });
    }
    console.error("Failed to create catalog item:", error);
    return Response.json({ message: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 503 });
  }
}