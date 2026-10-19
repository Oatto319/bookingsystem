"use client";

import { Clock3, DoorOpen, Users } from "lucide-react";
import type { FormEvent } from "react";
import type { Room } from "@/types/booking";
import { PanelHeading } from "./shared";

export function MeetingBookingPage({
  rooms,
  occupiedRoomCodes,
  busy,
  onSubmit,
}: {
  rooms: Room[];
  occupiedRoomCodes: Set<string>;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="form-layout">
      <section className="panel form-panel">
        <PanelHeading title="ข้อมูลการจองห้องประชุม" description="กรอกรายละเอียดการใช้ห้องให้ครบถ้วน" action={<span className="step-chip"><span>01</span> รายละเอียดการจอง</span>} />
        <form className="booking-form" onSubmit={onSubmit}>
          <label className="field-label">เลือกห้องประชุม <span>*</span>
            <select name="roomCode" required defaultValue="">
              <option value="" disabled>เลือกห้องประชุม</option>
              {rooms.map((room) => <option value={room.code} key={room.code}>{room.name} · สูงสุด {room.capacity} คน</option>)}
            </select>
          </label>
          <label className="field-label">หัวข้อการประชุม <span>*</span>
            <input name="topic" required maxLength={160} placeholder="เช่น ประชุมวางแผนการส่งเสริมการเกษตร" />
          </label>
          <div className="form-row">
            <label className="field-label">วันและเวลาเริ่มต้น <span>*</span><input name="startAt" type="datetime-local" required /></label>
            <label className="field-label">วันและเวลาสิ้นสุด <span>*</span><input name="endAt" type="datetime-local" required /></label>
          </div>
          <div className="form-row">
            <label className="field-label">จำนวนผู้เข้าร่วม <span>*</span><div className="input-icon-wrap"><Users size={16} /><input name="attendees" type="number" min="1" required placeholder="เช่น 8" /></div></label>
            <label className="field-label">ชื่อผู้ขอจอง <span>*</span><input name="requester" required maxLength={100} placeholder="ชื่อ - นามสกุล" /></label>
          </div>
          <div className="form-footer"><span><i /> ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</span><button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "ยืนยันการจอง"}</button></div>
        </form>
      </section>
      <aside className="panel side-info-panel">
        <PanelHeading title="ห้องประชุม" description="สถานะปัจจุบัน" action={<span className="live-indicator"><i /> สด</span>} />
        <div className="compact-rooms">
          {rooms.map((room) => (
            <div className="compact-room" key={room.code}>
              <div className={`room-icon room-${room.color}`}><DoorOpen size={18} /></div>
              <div><strong>{room.name}</strong><span>{room.capacity} ที่นั่ง · {room.location}</span></div>
              <span className={`status-dot ${occupiedRoomCodes.has(room.code) ? "is-busy" : ""}`} title={occupiedRoomCodes.has(room.code) ? "กำลังใช้งาน" : "ว่าง"} />
            </div>
          ))}
        </div>
        <div className="info-note"><Clock3 size={16} /><span>ระบบจะตรวจสอบช่วงเวลาซ้ำให้อัตโนมัติ ก่อนยืนยันการจอง</span></div>
      </aside>
    </div>
  );
}
