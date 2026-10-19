"use client";

import {
  ArrowRight,
  CalendarDays,
  CarFront,
  DoorOpen,
  Gauge,
  Leaf,
  Users,
} from "lucide-react";
import type { MeetingBooking, Room, Vehicle, VehicleBooking } from "@/types/booking";
import { PanelHeading, StatCard, EmptyState } from "./shared";
import { dateLabel } from "./utils";

export function OverviewPage({
  rooms,
  vehicles,
  meetingBookings,
  vehicleBookings,
  occupiedRoomCodes,
  todayCount,
  currentDate,
  onNavigate,
}: {
  rooms: Room[];
  vehicles: Vehicle[];
  meetingBookings: MeetingBooking[];
  vehicleBookings: VehicleBooking[];
  occupiedRoomCodes: Set<string>;
  todayCount: number;
  currentDate: Date | null;
  onNavigate: (view: "meeting" | "vehicle") => void;
}) {
  const inUseCount = vehicleBookings.filter((booking) => booking.status === "in_use").length;
  const upcomingMeetings = [...meetingBookings]
    .filter((booking) => currentDate !== null && new Date(booking.endAt) >= currentDate)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  return (
    <>
      <div className="stats-grid">
        <StatCard icon={<DoorOpen size={19} />} tone="green" label="ห้องประชุมทั้งหมด" value={String(rooms.length)} suffix="ห้อง" detail={`${occupiedRoomCodes.size} ห้องกำลังใช้งาน`} />
        <StatCard icon={<CalendarDays size={19} />} tone="blue" label="การจองวันนี้" value={String(todayCount)} suffix="รายการ" detail="ห้องประชุม" />
        <StatCard icon={<CarFront size={19} />} tone="orange" label="รถที่พร้อมใช้งาน" value={String(Math.max(vehicles.length - inUseCount, 0))} suffix={`/ ${vehicles.length} คัน`} detail={`${inUseCount} คันกำลังเดินทาง`} />
        <StatCard icon={<Gauge size={19} />} tone="purple" label="รายการเดินทาง" value={String(vehicleBookings.length)} suffix="รายการ" detail="บันทึกในสมุดเดินทาง" />
      </div>
      <div className="dashboard-grid">
        <section className="panel meeting-panel">
          <PanelHeading title="ห้องประชุม" description="ตรวจสอบห้องและสถานะการใช้งาน" action={<button className="text-button" onClick={() => onNavigate("meeting")}>ดูทั้งหมด <ArrowRight size={15} /></button>} />
          <div className="room-list">
            {rooms.map((room, index) => {
              const occupied = occupiedRoomCodes.has(room.code);
              return (
                <div className="room-row" key={room.code}>
                  <div className={`room-icon room-${room.color}`}><DoorOpen size={20} /></div>
                  <div className="room-info">
                    <strong>{room.name}</strong>
                    <span><Users size={13} /> {room.capacity} ที่นั่ง <i /> {room.location}</span>
                  </div>
                  <span className={`status-pill ${occupied ? "status-busy" : "status-free"}`}><b />{occupied ? "กำลังใช้งาน" : "ว่าง"}</span>
                  {index < rooms.length - 1 && <span className="room-divider" />}
                </div>
              );
            })}
            {rooms.length === 0 && <EmptyState text="ยังไม่มีข้อมูลห้องประชุม" />}
          </div>
        </section>
        <section className="panel quick-panel">
          <PanelHeading title="ทำรายการด่วน" description="เริ่มจองทรัพยากรของคุณ" action={<span className="sparkle">✳</span>} />
          <button className="quick-action" onClick={() => onNavigate("meeting")}>
            <span className="quick-icon quick-green"><DoorOpen size={19} /></span>
            <span><strong>จองห้องประชุม</strong><small>เลือกห้องและช่วงเวลาที่ต้องการ</small></span>
            <ArrowRight size={16} />
          </button>
          <button className="quick-action" onClick={() => onNavigate("vehicle")}>
            <span className="quick-icon quick-orange"><CarFront size={19} /></span>
            <span><strong>จองรถสำนักงาน</strong><small>บันทึกข้อมูลการเดินทางล่วงหน้า</small></span>
            <ArrowRight size={16} />
          </button>
          <div className="quick-tip"><Leaf size={15} /><span>อย่าลืมลงเลขไมล์เมื่อรับรถและกลับถึงสำนักงาน</span></div>
        </section>
      </div>
      <section className="panel upcoming-panel">
        <PanelHeading title="การประชุมที่กำลังจะมาถึง" description="รายการจองห้องประชุมล่าสุด" action={<button className="text-button" onClick={() => onNavigate("meeting")}>ดูปฏิทิน <ArrowRight size={15} /></button>} />
        {upcomingMeetings.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>หัวข้อการประชุม</th><th>ห้องประชุม</th><th>วันและเวลา</th><th>ผู้เข้าร่วม</th><th>ผู้จอง</th></tr></thead>
              <tbody>{upcomingMeetings.map((booking) => (
                <tr key={booking._id}>
                  <td><strong>{booking.topic}</strong></td><td>{booking.roomName}</td>
                  <td>{dateLabel(booking.startAt)}</td><td>{booking.attendees} คน</td><td>{booking.requester}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <EmptyState text="ยังไม่มีรายการประชุมที่กำลังจะมาถึง" />}
      </section>
    </>
  );
}
