export type MeetingInput = {
  roomCode: string;
  topic: string;
  startAt: Date;
  endAt: Date;
  attendees: number;
  department: string;
  phone: string;
};

type Parsed = { ok: true; value: MeetingInput } | { ok: false; message: string };

export function parseMeetingInput(data: Record<string, unknown>): Parsed {
  const roomCode = typeof data.roomCode === "string" ? data.roomCode : "";
  const topic = typeof data.topic === "string" ? data.topic.trim() : "";
  const department = typeof data.department === "string" ? data.department.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : "";
  const startAt = new Date(typeof data.startAt === "string" ? data.startAt : "");
  const endAt = new Date(typeof data.endAt === "string" ? data.endAt : "");
  const attendees = Number(data.attendees);

  if (
    !roomCode ||
    !topic ||
    topic.length > 160 ||
    !Number.isInteger(attendees) ||
    attendees < 1 ||
    Number.isNaN(startAt.getTime()) ||
    Number.isNaN(endAt.getTime()) ||
    endAt <= startAt
  ) {
    return { ok: false, message: "กรุณาตรวจสอบห้อง หัวข้อ จำนวนผู้เข้าร่วม และช่วงเวลา" };
  }
  if (department.length > 100) return { ok: false, message: "ชื่อหน่วยงานยาวเกินไป" };
  if (phone.length > 30 || !/^[0-9+\-\s()#,]*$/.test(phone)) {
    return { ok: false, message: "เบอร์ติดต่อไม่ถูกต้อง" };
  }
  return { ok: true, value: { roomCode, topic, startAt, endAt, attendees, department, phone } };
}
