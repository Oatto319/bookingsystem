"use client";

import { Clock3, DoorOpen, Pencil, Trash2, Users } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import type { MeetingFormValues } from "@/hooks/use-bookings";
import type { MeetingBooking, Room, SessionUser } from "@/types/booking";
import { canManageBooking, RoomCalendar, type SlotSelection } from "./room-calendar";
import { EmptyState, PanelHeading, SubmitHint } from "./shared";
import { dateLabel, timeLabel, toLocalInput } from "./utils";

type FormState = {
  roomCode: string;
  topic: string;
  startAt: string;
  endAt: string;
  attendees: string;
  department: string;
  phone: string;
};

/** ค่าเริ่มต้น: เริ่มเวลาปัจจุบัน สิ้นสุด +1 ชม. */
function initialForm(now: Date | null, user: SessionUser): FormState {
  const start = now ?? new Date();
  return {
    roomCode: "",
    topic: "",
    startAt: toLocalInput(start),
    endAt: toLocalInput(new Date(start.getTime() + 3_600_000)),
    attendees: "",
    department: user.department,
    phone: "",
  };
}

export function MeetingBookingPage({
  rooms,
  bookings,
  occupiedRoomCodes,
  currentDate,
  user,
  busy,
  offline,
  onSubmit,
  onCancel,
}: {
  rooms: Room[];
  bookings: MeetingBooking[];
  occupiedRoomCodes: Set<string>;
  currentDate: Date | null;
  user: SessionUser;
  busy: boolean;
  offline: boolean;
  onSubmit: (values: MeetingFormValues, editingId: string | null) => Promise<boolean>;
  onCancel: (id: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(currentDate, user));
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  const room = rooms.find((item) => item.code === form.roomCode);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const start = useMemo(() => (form.startAt ? new Date(form.startAt) : null), [form.startAt]);
  const end = useMemo(() => (form.endAt ? new Date(form.endAt) : null), [form.endAt]);
  const timeInvalid = !start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start;

  // แจ้งเตือนทันทีถ้าช่วงเวลาที่เลือกชนกับรายการที่จองไว้ (ไม่ต้องรอกดยืนยัน)
  const conflict = useMemo(() => {
    if (!room || timeInvalid || !start || !end) return null;
    return (
      bookings.find(
        (b) =>
          b.roomCode === room.code &&
          b._id !== editingId &&
          new Date(b.startAt) < end &&
          new Date(b.endAt) > start,
      ) ?? null
    );
  }, [bookings, room, start, end, timeInvalid, editingId]);

  const attendees = Number(form.attendees);
  const overCapacity = room !== undefined && form.attendees !== "" && attendees > room.capacity;
  const canSubmit = !busy && !offline && !!room && !timeInvalid && !conflict && !overCapacity && attendees >= 1;

  const mine = useMemo(
    () =>
      bookings
        .filter((b) => b.requesterId === user.username && canManageBooking(b, user, currentDate))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [bookings, user, currentDate],
  );

  function resetForm() {
    setEditingId(null);
    setForm(initialForm(currentDate, user));
  }

  function focusForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => topicRef.current?.focus({ preventScroll: true }), 300);
  }

  function pick(selection: SlotSelection) {
    const target = rooms.find((item) => item.code === selection.roomCode);
    setForm((prev) => ({
      ...prev,
      roomCode: selection.roomCode,
      startAt: toLocalInput(selection.start),
      endAt: toLocalInput(selection.end),
      attendees: target && prev.attendees !== "" ? String(Math.min(Number(prev.attendees), target.capacity)) : prev.attendees,
    }));
    focusForm();
  }

  function edit(booking: MeetingBooking) {
    setEditingId(booking._id);
    setForm({
      roomCode: booking.roomCode,
      topic: booking.topic,
      startAt: toLocalInput(new Date(booking.startAt)),
      endAt: toLocalInput(new Date(booking.endAt)),
      attendees: String(booking.attendees),
      department: booking.department ?? "",
      phone: booking.phone ?? "",
    });
    focusForm();
  }

  async function cancel(booking: MeetingBooking) {
    if (!window.confirm(`ยกเลิกการจอง "${booking.topic}" ใช่หรือไม่?`)) return;
    if (await onCancel(booking._id) && editingId === booking._id) resetForm();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const ok = await onSubmit({ ...form, attendees }, editingId);
    if (ok) resetForm();
  }

  function changeRoom(code: string) {
    const target = rooms.find((item) => item.code === code);
    setForm((prev) => ({
      ...prev,
      roomCode: code,
      // จำกัดจำนวนผู้เข้าร่วมตามความจุของห้องที่เลือก
      attendees: target && prev.attendees !== "" ? String(Math.min(Number(prev.attendees), target.capacity)) : prev.attendees,
    }));
  }

  function changeStart(value: string) {
    setForm((prev) => {
      const next = { ...prev, startAt: value };
      const newStart = new Date(value);
      if (!Number.isNaN(newStart.getTime()) && (!prev.endAt || new Date(prev.endAt) <= newStart)) {
        next.endAt = toLocalInput(new Date(newStart.getTime() + 3_600_000));
      }
      return next;
    });
  }

  const selection: SlotSelection | null =
    room && start && end && !timeInvalid ? { roomCode: room.code, start, end } : null;

  return (
    <div className="stack">
      <RoomCalendar
        rooms={rooms}
        bookings={bookings}
        currentDate={currentDate}
        user={user}
        selection={selection}
        busy={busy}
        onPick={pick}
        onEdit={edit}
        onCancel={cancel}
      />
      <div className="form-layout">
        <section className="panel form-panel" ref={formRef}>
          <PanelHeading
            title={editingId ? "แก้ไขการจองห้องประชุม" : "ข้อมูลการจองห้องประชุม"}
            description={editingId ? "ปรับรายละเอียดแล้วกดบันทึกการแก้ไข" : "กรอกรายละเอียดการใช้ห้องให้ครบถ้วน"}
            action={<span className="step-chip"><span>{editingId ? "แก้ไข" : "01"}</span> รายละเอียดการจอง</span>}
          />
          <form className="booking-form" onSubmit={submit}>
            <label className="field-label">เลือกห้องประชุม <span>*</span>
              <select name="roomCode" required value={form.roomCode} onChange={(e) => changeRoom(e.target.value)}>
                <option value="" disabled>เลือกห้องประชุม</option>
                {rooms.map((item) => <option value={item.code} key={item.code}>{item.name} · สูงสุด {item.capacity} คน</option>)}
              </select>
            </label>
            <label className="field-label">หัวข้อการประชุม <span>*</span>
              <input ref={topicRef} name="topic" required maxLength={160} value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="เช่น ประชุมวางแผนการส่งเสริมการเกษตร" />
            </label>
            <div className="form-row">
              <label className="field-label">วันและเวลาเริ่มต้น <span>*</span><input name="startAt" type="datetime-local" required value={form.startAt} onChange={(e) => changeStart(e.target.value)} /></label>
              <label className="field-label">วันและเวลาสิ้นสุด <span>*</span><input name="endAt" type="datetime-local" required min={form.startAt} value={form.endAt} onChange={(e) => set("endAt", e.target.value)} /></label>
            </div>
            {timeInvalid && form.startAt && form.endAt && <p className="field-error" role="alert">เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น</p>}
            {conflict && (
              <p className="field-error" role="alert">
                ช่วงเวลานี้ชนกับ “{conflict.topic}” ({timeLabel(conflict.startAt)}–{timeLabel(conflict.endAt)}, {conflict.requester}) กรุณาเลือกเวลาอื่น
              </p>
            )}
            <div className="form-row">
              <label className="field-label">จำนวนผู้เข้าร่วม <span>*</span>
                <div className="input-icon-wrap"><Users size={16} />
                  <input name="attendees" type="number" min="1" max={room?.capacity} required value={form.attendees} onChange={(e) => set("attendees", e.target.value)} placeholder={room ? `สูงสุด ${room.capacity} คน` : "เลือกห้องก่อน"} />
                </div>
              </label>
              <label className="field-label">ผู้ขอจอง
                <input value={user.displayName} readOnly aria-readonly="true" className="readonly-input" />
              </label>
            </div>
            {overCapacity && <p className="field-error" role="alert">ห้องนี้รองรับได้ไม่เกิน {room?.capacity} คน</p>}
            <div className="form-row">
              <label className="field-label">หน่วยงาน <small>(ไม่บังคับ)</small><input name="department" maxLength={100} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="เช่น กลุ่มส่งเสริมการเกษตร" /></label>
              <label className="field-label">เบอร์ติดต่อ <small>(ไม่บังคับ)</small><input name="phone" type="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="เช่น 081-234-5678" /></label>
            </div>
            <div className="form-footer">
              <span><i /> ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</span>
              <div className="footer-actions">
                {editingId && <button type="button" className="secondary-button" onClick={resetForm}>ยกเลิกการแก้ไข</button>}
                <button className="primary-button" disabled={!canSubmit}>{busy ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "ยืนยันการจอง"}</button>
              </div>
            </div>
            <SubmitHint offline={offline} />
          </form>
        </section>
        <aside className="panel side-info-panel">
          <PanelHeading title="การจองของฉัน" description="รายการที่ยังไม่สิ้นสุด · แก้ไขหรือยกเลิกได้" />
          {mine.length ? (
            <div className="my-bookings">
              {mine.map((booking) => (
                <div className="my-booking" key={booking._id}>
                  <div><strong>{booking.topic}</strong><span>{booking.roomName}</span><span>{dateLabel(booking.startAt)} – {timeLabel(booking.endAt)}</span></div>
                  <div className="my-booking-actions">
                    <button type="button" className="icon-button" aria-label={`แก้ไข ${booking.topic}`} title="แก้ไข" onClick={() => edit(booking)}><Pencil size={14} /></button>
                    <button type="button" className="icon-button danger" aria-label={`ยกเลิก ${booking.topic}`} title="ยกเลิก" disabled={busy} onClick={() => cancel(booking)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState text="ยังไม่มีการจองที่ต้องดำเนินการ" />}
          <div className="compact-rooms">
            {rooms.map((item) => (
              <div className="compact-room" key={item.code}>
                <div className={`room-icon room-${item.color}`}><DoorOpen size={18} /></div>
                <div><strong>{item.name}</strong><span>{item.capacity} ที่นั่ง · {item.location}</span></div>
                <span className={`status-dot ${occupiedRoomCodes.has(item.code) ? "is-busy" : ""}`} title={occupiedRoomCodes.has(item.code) ? "กำลังใช้งาน" : "ว่าง"} />
              </div>
            ))}
          </div>
          <div className="info-note"><Clock3 size={16} /><span>ระบบตรวจช่วงเวลาซ้ำให้ทันทีที่เลือก และตรวจอีกครั้งตอนยืนยัน</span></div>
        </aside>
      </div>
    </div>
  );
}
