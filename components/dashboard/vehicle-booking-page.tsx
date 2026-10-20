"use client";

import { CarFront, Gauge, MapPin, TriangleAlert, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { DepartureFormValues } from "@/hooks/use-bookings";
import type { SessionUser, Vehicle, VehicleBooking } from "@/types/booking";
import { PanelHeading, SubmitHint } from "./shared";
import { dateLabel, isOverdue, number, toLocalInput } from "./utils";

type FormState = {
  vehicleCode: string;
  departedAt: string;
  expectedReturnAt: string;
  destination: string;
  purpose: string;
  driver: string;
  passengers: string;
  startingOdometer: string;
  note: string;
};

const initialForm = (now: Date | null): FormState => ({
  vehicleCode: "",
  departedAt: toLocalInput(now ?? new Date()), // เวลาปัจจุบัน
  expectedReturnAt: "",
  destination: "",
  purpose: "",
  driver: "",
  passengers: "",
  startingOdometer: "",
  note: "",
});

export function VehicleBookingPage({
  vehicles,
  bookings,
  currentDate,
  user,
  busy,
  offline,
  onSubmit,
}: {
  vehicles: Vehicle[];
  bookings: VehicleBooking[];
  currentDate: Date | null;
  user: SessionUser;
  busy: boolean;
  offline: boolean;
  onSubmit: (values: DepartureFormValues) => Promise<boolean>;
}) {
  const [form, setForm] = useState<FormState>(() => initialForm(currentDate));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const vehicle = vehicles.find((item) => item.code === form.vehicleCode);
  const lastOdometer = vehicle?.lastOdometer ?? null;
  const odometer = form.startingOdometer === "" ? null : Number(form.startingOdometer);
  const odometerTooLow = odometer !== null && lastOdometer !== null && odometer < lastOdometer;
  const passengers = form.passengers === "" ? 0 : Number(form.passengers);
  const overSeats = vehicle !== undefined && passengers > vehicle.seats;
  const returnInvalid =
    form.expectedReturnAt !== "" && new Date(form.expectedReturnAt) <= new Date(form.departedAt);
  const canSubmit = !busy && !offline && !!vehicle && odometer !== null && !overSeats && !returnInvalid;

  function changeVehicle(code: string) {
    const next = vehicles.find((item) => item.code === code);
    setForm((prev) => ({
      ...prev,
      vehicleCode: code,
      // เติมเลขไมล์เริ่มต้นจากทริปล่าสุดของรถคันนี้
      startingOdometer: next?.lastOdometer != null ? String(next.lastOdometer) : "",
      passengers: next && prev.passengers !== "" ? String(Math.min(Number(prev.passengers), next.seats)) : prev.passengers,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || odometer === null) return;
    const ok = await onSubmit({
      vehicleCode: form.vehicleCode,
      departedAt: form.departedAt,
      expectedReturnAt: form.expectedReturnAt,
      destination: form.destination,
      purpose: form.purpose,
      driver: form.driver,
      passengers,
      startingOdometer: odometer,
      note: form.note,
    });
    if (ok) setForm(initialForm(currentDate));
  }

  return (
    <div className="form-layout vehicle-layout">
      <section className="panel form-panel">
        <PanelHeading title="ข้อมูลก่อนออกเดินทาง" description="ระยะที่ 1 · กรอกข้อมูลและเลขไมล์ก่อนนำรถออก" action={<span className="step-chip"><span>01</span> Departure log</span>} />
        <div className="phase-progress"><div className="phase active"><b>1</b><span>ก่อนออกเดินทาง</span></div><i /><div className="phase"><b>2</b><span>เมื่อกลับถึงสำนักงาน</span></div></div>
        <form className="booking-form" onSubmit={submit}>
          <label className="field-label">เลือกรถสำนักงาน <span>*</span>
            <select name="vehicleCode" required value={form.vehicleCode} onChange={(e) => changeVehicle(e.target.value)}>
              <option value="" disabled>เลือกรถที่ต้องการใช้</option>
              {vehicles.map((item) => {
                const inUse = bookings.some((booking) => booking.vehicleCode === item.code && booking.status === "in_use");
                return <option value={item.code} key={item.code} disabled={inUse}>{item.name} · {item.registration}{inUse ? " (กำลังใช้งาน)" : ""}</option>;
              })}
            </select>
          </label>
          <div className="form-row">
            <label className="field-label">วันและเวลาออกเดินทาง <span>*</span><input name="departedAt" type="datetime-local" required value={form.departedAt} onChange={(e) => set("departedAt", e.target.value)} /></label>
            <label className="field-label">คาดว่าจะกลับ <small>(ไม่บังคับ · ใช้เตือนเมื่อเกินเวลา)</small><input name="expectedReturnAt" type="datetime-local" min={form.departedAt} value={form.expectedReturnAt} onChange={(e) => set("expectedReturnAt", e.target.value)} /></label>
          </div>
          {returnInvalid && <p className="field-error" role="alert">เวลาที่คาดว่าจะกลับต้องหลังเวลาออกเดินทาง</p>}
          <div className="form-row">
            <label className="field-label">สถานที่ปลายทาง <span>*</span><div className="input-icon-wrap"><MapPin size={16} /><input name="destination" required maxLength={200} value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="ระบุจังหวัด / สถานที่" /></div></label>
            <label className="field-label">วัตถุประสงค์การเดินทาง <span>*</span><input name="purpose" required maxLength={200} value={form.purpose} onChange={(e) => set("purpose", e.target.value)} placeholder="เช่น ตรวจแปลงเกษตรกร" /></label>
          </div>
          <div className="form-row">
            <label className="field-label">พนักงานขับรถ <span>*</span><input name="driver" required maxLength={100} value={form.driver} onChange={(e) => set("driver", e.target.value)} placeholder="ชื่อพนักงานขับรถ" /></label>
            <label className="field-label">จำนวนผู้โดยสาร <small>(ไม่รวมผู้ขับ)</small><div className="input-icon-wrap"><Users size={16} /><input name="passengers" type="number" min="0" max={vehicle?.seats} value={form.passengers} onChange={(e) => set("passengers", e.target.value)} placeholder={vehicle ? `สูงสุด ${vehicle.seats} คน` : "เลือกรถก่อน"} /></div></label>
          </div>
          {overSeats && <p className="field-error" role="alert">รถคันนี้รองรับผู้โดยสารได้ไม่เกิน {vehicle?.seats} คน</p>}
          <div className="form-row">
            <label className="field-label">เลขไมล์เริ่มต้น <span>*</span>
              <div className="input-icon-wrap"><Gauge size={16} /><input name="startingOdometer" type="number" min="0" step="0.1" required value={form.startingOdometer} onChange={(e) => set("startingOdometer", e.target.value)} placeholder="เลขไมล์หน้าปัดก่อนออกเดินทาง" /><em>กม.</em></div>
            </label>
            <label className="field-label">ผู้ขอใช้บริการ
              <input value={user.displayName} readOnly aria-readonly="true" className="readonly-input" />
            </label>
          </div>
          {lastOdometer !== null && !odometerTooLow && vehicle && (
            <p className="field-hint">เลขไมล์ล่าสุดของ {vehicle.name} คือ {number(lastOdometer)} กม. (เติมให้อัตโนมัติ ตรวจกับหน้าปัดจริงอีกครั้ง)</p>
          )}
          {odometerTooLow && (
            <p className="field-warning" role="alert"><TriangleAlert size={14} /> เลขไมล์ต่ำกว่าเลขไมล์ล่าสุดของรถคันนี้ ({number(lastOdometer)} กม.) กรุณาตรวจสอบหน้าปัดอีกครั้งก่อนบันทึก</p>
          )}
          <label className="field-label">หมายเหตุ <small>(ไม่บังคับ)</small><textarea name="note" rows={3} maxLength={500} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการเดินทาง" /></label>
          <div className="form-footer"><span><i /> กรอกเลขไมล์ตามหน้าปัดรถก่อนออกเดินทาง</span><button className="primary-button" disabled={!canSubmit}>{busy ? "กำลังบันทึก..." : "บันทึกก่อนออกเดินทาง"}</button></div>
          <SubmitHint offline={offline} />
        </form>
      </section>
      <VehicleAvailability vehicles={vehicles} bookings={bookings} now={currentDate} />
    </div>
  );
}

function VehicleAvailability({ vehicles, bookings, now }: { vehicles: Vehicle[]; bookings: VehicleBooking[]; now: Date | null }) {
  return (
    <aside className="panel side-info-panel">
      <PanelHeading title="รถสำนักงาน" description="สถานะและผู้ใช้งานปัจจุบัน" action={<span className="live-indicator"><i /> {vehicles.length} คัน</span>} />
      <div className="vehicle-list">
        {vehicles.map((vehicle) => {
          const active = bookings.find((booking) => booking.vehicleCode === vehicle.code && booking.status === "in_use");
          const overdue = active ? isOverdue(active, now) : false;
          return (
            <div className="vehicle-card" key={vehicle.code}>
              <div className="vehicle-art"><CarFront size={26} /></div>
              <div className="vehicle-copy">
                <strong>{vehicle.name}</strong>
                <span>{vehicle.registration} · {vehicle.seats} ที่นั่ง</span>
                {active && <span>ใช้โดย {active.departureLog.requester} · ออก {dateLabel(active.departureLog.departedAt)}</span>}
              </div>
              <span className={`status-pill ${overdue ? "status-late" : active ? "status-busy" : "status-free"}`}><b />{overdue ? "เกินกำหนด" : active ? "ใช้งาน" : "พร้อม"}</span>
            </div>
          );
        })}
      </div>
      <div className="distance-note"><span className="distance-icon"><Gauge size={18} /></span><div><strong>ระบบคำนวณระยะทางอัตโนมัติ</strong><p>ระยะทางรวม = เลขไมล์สิ้นสุด − เลขไมล์เริ่มต้น</p></div></div>
      <div className="info-note"><span>ระบบนี้บันทึกการใช้รถตอนนำรถออกจริง ไม่ใช่การจองล่วงหน้า หากต้องการใช้รถวันอื่นให้ประสานผู้ดูแลก่อน</span></div>
    </aside>
  );
}
