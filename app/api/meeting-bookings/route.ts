import { parseMeetingInput } from "@/lib/meeting-input";
import { requireUser } from "@/lib/session";
import { MeetingRoom } from "@/models/meeting-room";
import { MeetingRoomBooking } from "@/models/meeting-room-booking";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    // ย้อนหลัง 30 วัน เพื่อให้ปฏิทินเลื่อนดูย้อนหลังได้โดยรายการไม่โตไม่จำกัด
    const since = new Date(Date.now() - 30 * 86_400_000);
    const bookings = await MeetingRoomBooking.find({ status: "confirmed", endAt: { $gte: since } })
      .sort({ startAt: 1 })
      .lean()
      .exec();
    return Response.json({ bookings });
  } catch (error) {
    console.error("Failed to load meeting room bookings:", error);
    return Response.json({ message: "ไม่สามารถโหลดรายการจองห้องประชุมได้" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ message: "ข้อมูลการจองไม่ถูกต้อง" }, { status: 400 });
    }
    const parsed = parseMeetingInput(body as Record<string, unknown>);
    if (!parsed.ok) return Response.json({ message: parsed.message }, { status: 400 });
    const { roomCode, topic, startAt, endAt, attendees, department, phone } = parsed.value;

    if (startAt.getTime() < Date.now() - 5 * 60_000) {
      return Response.json(
        { message: "ไม่สามารถจองห้องประชุมย้อนหลังได้ กรุณาเลือกเวลาเริ่มต้นใหม่" },
        { status: 400 },
      );
    }

    const room = await MeetingRoom.findOne({ code: roomCode, active: true }).lean().exec();
    if (!room) return Response.json({ message: "ไม่พบห้องประชุมที่เลือก" }, { status: 404 });
    if (attendees > room.capacity) {
      return Response.json(
        { message: `ห้องนี้รองรับผู้เข้าร่วมได้ไม่เกิน ${room.capacity} คน` },
        { status: 400 },
      );
    }

    const conflict = await MeetingRoomBooking.exists({
      roomCode,
      status: "confirmed",
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (conflict) {
      return Response.json(
        { message: "ช่วงเวลานี้มีการจองห้องประชุมแล้ว กรุณาเลือกเวลาอื่น" },
        { status: 409 },
      );
    }

    const booking = await MeetingRoomBooking.create({
      roomCode,
      roomName: room.name,
      startAt,
      endAt,
      topic,
      attendees,
      department: department || auth.user.department,
      phone,
      requester: auth.user.displayName,
      requesterId: auth.user.username,
    });

    // ตรวจซ้ำหลังบันทึก: ถ้ามีคนจองทับเวลาเดียวกันพร้อมกัน ให้รายการที่สร้างทีหลัง (_id มากกว่า) ถอนตัว
    const raced = await MeetingRoomBooking.exists({
      _id: { $lt: booking._id },
      roomCode,
      status: "confirmed",
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (raced) {
      await MeetingRoomBooking.deleteOne({ _id: booking._id });
      return Response.json(
        { message: "ช่วงเวลานี้มีการจองห้องประชุมแล้ว กรุณาเลือกเวลาอื่น" },
        { status: 409 },
      );
    }

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Failed to create meeting room booking:", error);
    return Response.json({ message: "บันทึกการจองไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
