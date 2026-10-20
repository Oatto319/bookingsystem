import { isValidObjectId } from "mongoose";
import { parseMeetingInput } from "@/lib/meeting-input";
import { requireUser } from "@/lib/session";
import { MeetingRoom } from "@/models/meeting-room";
import { MeetingRoomBooking } from "@/models/meeting-room-booking";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/meeting-bookings/:id
 *  - { action: "cancel" }  ยกเลิกการจอง
 *  - { roomCode, startAt, endAt, topic, attendees, ... } แก้ไขการจอง
 * ทำได้เฉพาะเจ้าของรายการหรือผู้ดูแลระบบ
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const { id } = await params;
    if (!isValidObjectId(id)) return Response.json({ message: "ไม่พบการจองที่ต้องการ" }, { status: 404 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

    const existing = await MeetingRoomBooking.findOne({ _id: id, status: "confirmed" }).lean().exec();
    if (!existing) {
      return Response.json({ message: "ไม่พบการจองนี้ หรือถูกยกเลิกไปแล้ว" }, { status: 404 });
    }
    if (auth.user.role !== "admin" && existing.requesterId !== auth.user.username) {
      return Response.json({ message: "คุณไม่มีสิทธิ์จัดการการจองของผู้อื่น" }, { status: 403 });
    }

    if (body.action === "cancel") {
      await MeetingRoomBooking.updateOne(
        { _id: id, status: "confirmed" },
        { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: auth.user.username } },
      );
      return Response.json({ ok: true });
    }

    // แก้ไขการจอง
    if (existing.endAt.getTime() < Date.now()) {
      return Response.json({ message: "การประชุมนี้สิ้นสุดไปแล้ว ไม่สามารถแก้ไขได้" }, { status: 400 });
    }
    const parsed = parseMeetingInput(body);
    if (!parsed.ok) return Response.json({ message: parsed.message }, { status: 400 });
    const { roomCode, topic, startAt, endAt, attendees, department, phone } = parsed.value;

    if (startAt.getTime() < Date.now() - 5 * 60_000 && startAt.getTime() !== existing.startAt.getTime()) {
      return Response.json({ message: "ไม่สามารถย้ายการจองไปเป็นเวลาที่ผ่านมาแล้ว" }, { status: 400 });
    }
    const room = await MeetingRoom.findOne({ code: roomCode, active: true }).lean().exec();
    if (!room) return Response.json({ message: "ไม่พบห้องประชุมที่เลือก" }, { status: 404 });
    if (attendees > room.capacity) {
      return Response.json({ message: `ห้องนี้รองรับผู้เข้าร่วมได้ไม่เกิน ${room.capacity} คน` }, { status: 400 });
    }

    const overlap = {
      _id: { $ne: existing._id },
      roomCode,
      status: "confirmed",
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    };
    if (await MeetingRoomBooking.exists(overlap)) {
      return Response.json({ message: "ช่วงเวลานี้มีการจองห้องประชุมแล้ว กรุณาเลือกเวลาอื่น" }, { status: 409 });
    }

    const updated = await MeetingRoomBooking.findByIdAndUpdate(
      id,
      { $set: { roomCode, roomName: room.name, startAt, endAt, topic, attendees, department, phone } },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();
    if (!updated) return Response.json({ message: "ไม่พบการจองนี้" }, { status: 404 });

    // ตรวจซ้ำหลังบันทึก: ถ้าชนกับรายการที่มีอยู่ก่อน ให้คืนค่าเดิม
    const raced = await MeetingRoomBooking.exists({ ...overlap, updatedAt: { $lte: updated.updatedAt } });
    if (raced) {
      await MeetingRoomBooking.updateOne(
        { _id: id },
        {
          $set: {
            roomCode: existing.roomCode,
            roomName: existing.roomName,
            startAt: existing.startAt,
            endAt: existing.endAt,
            topic: existing.topic,
            attendees: existing.attendees,
            department: existing.department,
            phone: existing.phone,
          },
        },
      );
      return Response.json({ message: "ช่วงเวลานี้มีการจองห้องประชุมแล้ว กรุณาเลือกเวลาอื่น" }, { status: 409 });
    }
    return Response.json({ booking: updated });
  } catch (error) {
    console.error("Failed to update meeting booking:", error);
    return Response.json({ message: "บันทึกการเปลี่ยนแปลงไม่สำเร็จ" }, { status: 503 });
  }
}
