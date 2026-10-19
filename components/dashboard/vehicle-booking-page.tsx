"use client";

import { CarFront, Gauge, MapPin } from "lucide-react";
import type { FormEvent } from "react";
import type { Vehicle, VehicleBooking } from "@/types/booking";
import { PanelHeading } from "./shared";

export function VehicleBookingPage({
  vehicles,
  bookings,
  busy,
  onSubmit,
}: {
  vehicles: Vehicle[];
  bookings: VehicleBooking[];
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="form-layout vehicle-layout">
      <section className="panel form-panel">
        <PanelHeading title="ข้อมูลก่อนออกเดินทาง" description="ระยะที่ 1 · กรอกข้อมูลและเลขไมล์ก่อนนำรถออก" action={<span className="step-chip"><span>01</span> Departure log</span>} />
        <div className="phase-progress"><div className="phase active"><b>1</b><span>ก่อนออกเดินทาง</span></div><i /><div className="phase"><b>2</b><span>เมื่อกลับถึงสำนักงาน</span></div></div>
        <form className="booking-form" onSubmit={onSubmit}>
          <label className="field-label">เลือกรถสำนักงาน <span>*</span>
            <select name="vehicleCode" required defaultValue="">
              <option value="" disabled>เลือกรถที่ต้องการใช้</option>
              {vehicles.map((vehicle) => {
                const inUse = bookings.some((booking) => booking.vehicleCode === vehicle.code && booking.status === "in_use");
                return <option value={vehicle.code} key={vehicle.code} disabled={inUse}>{vehicle.name} · {vehicle.registration}{inUse ? " (กำลังใช้งาน)" : ""}</option>;
              })}
            </select>
          </label>
          <div className="form-row">
            <label className="field-label">วันและเวลาออกเดินทาง <span>*</span><input name="departedAt" type="datetime-local" required /></label>
            <label className="field-label">ชื่อผู้ขอใช้บริการ <span>*</span><input name="requester" required maxLength={100} placeholder="ชื่อ - นามสกุล" /></label>
          </div>
          <div className="form-row">
            <label className="field-label">สถานที่ปลายทาง <span>*</span><div className="input-icon-wrap"><MapPin size={16} /><input name="destination" required maxLength={200} placeholder="ระบุจังหวัด / สถานที่" /></div></label>
            <label className="field-label">พนักงานขับรถ <span>*</span><input name="driver" required maxLength={100} placeholder="ชื่อพนักงานขับรถ" /></label>
          </div>
          <label className="field-label">เลขไมล์เริ่มต้น <span>*</span><div className="input-icon-wrap"><Gauge size={16} /><input name="startingOdometer" type="number" min="0" step="0.1" required placeholder="เลขไมล์หน้าปัดก่อนออกเดินทาง" /><em>กม.</em></div></label>
          <label className="field-label">หมายเหตุ <small>(ไม่บังคับ)</small><textarea name="note" rows={3} maxLength={500} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการเดินทาง" /></label>
          <div className="form-footer"><span><i /> กรอกเลขไมล์ตามหน้าปัดรถก่อนออกเดินทาง</span><button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกก่อนออกเดินทาง"}</button></div>
        </form>
      </section>
      <VehicleAvailability vehicles={vehicles} bookings={bookings} />
    </div>
  );
}

function VehicleAvailability({ vehicles, bookings }: { vehicles: Vehicle[]; bookings: VehicleBooking[] }) {
  return (
    <aside className="panel side-info-panel">
      <PanelHeading title="รถสำนักงาน" description="รถที่มีในระบบ" action={<span className="live-indicator"><i /> {vehicles.length} คัน</span>} />
      <div className="vehicle-list">
        {vehicles.map((vehicle) => {
          const inUse = bookings.some((booking) => booking.vehicleCode === vehicle.code && booking.status === "in_use");
          return (
            <div className="vehicle-card" key={vehicle.code}>
              <div className="vehicle-art"><CarFront size={26} /></div>
              <div className="vehicle-copy"><strong>{vehicle.name}</strong><span>{vehicle.registration} · {vehicle.seats} ที่นั่ง</span></div>
              <span className={`status-pill ${inUse ? "status-busy" : "status-free"}`}><b />{inUse ? "ใช้งาน" : "พร้อม"}</span>
            </div>
          );
        })}
      </div>
      <div className="distance-note"><span className="distance-icon"><Gauge size={18} /></span><div><strong>ระบบคำนวณระยะทางอัตโนมัติ</strong><p>ระยะทางรวม = เลขไมล์สิ้นสุด − เลขไมล์เริ่มต้น</p></div></div>
    </aside>
  );
}
