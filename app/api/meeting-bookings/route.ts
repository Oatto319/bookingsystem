import { ensureDefaultCatalog } from "@/lib/catalog";
import { MeetingRoomBooking } from "@/models/meeting-room-booking";
import { MeetingRoom } from "@/models/meeting-room";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    await ensureDefaultCatalog();
    const bookings = await MeetingRoomBooking.find({ status: "confirmed" })
      .sort({ startAt: 1 })
      .lean()
      .exec();
    return Response.json({ bookings });
  } catch (error) {
    console.error("Failed to load meeting room bookings:", error);
    return Response.json(
      { message: "ไม่สามารถโหลดรายการจองห้องประชุมได้" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureDefaultCatalog();
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ message: "ข้อมูลการจองไม่ถูกต้อง" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const roomCode = typeof data.roomCode === "string" ? data.roomCode : "";
    const topic = typeof data.topic === "string" ? data.topic.trim() : "";
    const requester = typeof data.requester === "string" ? data.requester.trim() : "";
    const startAt = new Date(typeof data.startAt === "string" ? data.startAt : "");
    const endAt = new Date(typeof data.endAt === "string" ? data.endAt : "");
    const attendees = Number(data.attendees);

    if (
      !roomCode ||
      !topic ||
      !requester ||
      topic.length > 160 ||
      requester.length > 100 ||
      !Number.isInteger(attendees) ||
      attendees < 1 ||
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      endAt <= startAt
    ) {
      return Response.json(
        { message: "กรุณาตรวจสอบห้อง หัวข้อ ผู้จอง จำนวนผู้เข้าร่วม และช่วงเวลา" },
        { status: 400 },
      );
    }

    if (startAt.getTime() < Date.now() - 5 * 60_000) {
      return Response.json(
        { message: "ไม่สามารถจองห้องประชุมย้อนหลังได้ กรุณาเลือกเวลาเริ่มต้นใหม่" },
        { status: 400 },
      );
    }

    const room = await MeetingRoom.findOne({ code: roomCode, active: true }).lean().exec();
    if (!room) {
      return Response.json({ message: "ไม่พบห้องประชุมที่เลือก" }, { status: 404 });
    }
    if (attendees > room.capacity) {
      return Response.json(
        { message: `ห้องนี้รองรับผู้เข้าร่วมได้ไม่เกิน ${room.capacity} คน` },
        { status: 400 },
      );
    }

    const conflictingBooking = await MeetingRoomBooking.exists({
      roomCode,
      status: "confirmed",
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    });
    if (conflictingBooking) {
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
      requester,
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
