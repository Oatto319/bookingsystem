"use client";

import { ArrowDownLeft, ArrowRight, Check, Fuel, Gauge, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { ReturnFormValues } from "@/hooks/use-bookings";
import type { VehicleBooking } from "@/types/booking";
import { toLocalInput } from "./utils";

export function ReturnVehicleModal({
  booking,
  now,
  busy,
  offline,
  onClose,
  onSubmit,
}: {
  booking: VehicleBooking;
  now: Date | null;
  busy: boolean;
  offline: boolean;
  onClose: () => void;
  onSubmit: (values: ReturnFormValues) => Promise<boolean>;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, onClose);

  const [returnedAt, setReturnedAt] = useState(() => toLocalInput(now ?? new Date()));
  const [endingOdometer, setEndingOdometer] = useState(String(booking.departureLog.startingOdometer));
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelCost, setFuelCost] = useState("");

  const start = booking.departureLog.startingOdometer;
  const distance = Math.max(Math.round((Number(endingOdometer || 0) - start) * 10) / 10, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (offline) return;
    const ok = await onSubmit({ returnedAt, endingOdometer: Number(endingOdometer), fuelLiters, fuelCost });
    if (ok) onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="return-modal" role="dialog" aria-modal="true" aria-labelledby="return-title" ref={dialogRef} tabIndex={-1}>
        <div className="modal-heading">
          <div className="modal-icon"><ArrowDownLeft size={20} /></div>
          <button className="icon-button" aria-label="ปิด" onClick={onClose}><X size={18} /></button>
        </div>
        <h2 id="return-title">บันทึกเมื่อกลับถึงสำนักงาน</h2>
        <p className="modal-description">{booking.vehicleName} · {booking.departureLog.destination}</p>
        <div className="distance-summary">
          <span>เลขไมล์เริ่มต้น<strong>{start.toLocaleString("th-TH")} กม.</strong></span>
          <ArrowRight size={16} />
          <span>ระยะทางที่ใช้<strong>{distance.toLocaleString("th-TH")} กม.</strong></span>
        </div>
        <form className="booking-form" onSubmit={submit}>
          <label className="field-label">วันและเวลากลับ <span>*</span><input type="datetime-local" value={returnedAt} min={toLocalInput(new Date(booking.departureLog.departedAt))} onChange={(e) => setReturnedAt(e.target.value)} required /></label>
          <label className="field-label">เลขไมล์สิ้นสุด <span>*</span>
            <div className="input-icon-wrap"><Gauge size={16} /><input type="number" min={start} step="0.1" value={endingOdometer} onChange={(e) => setEndingOdometer(e.target.value)} required /><em>กม.</em></div>
          </label>
          <div className="form-row">
            <label className="field-label">เติมน้ำมัน <small>(ไม่บังคับ)</small><div className="input-icon-wrap"><Fuel size={16} /><input type="number" min="0" step="0.01" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} placeholder="จำนวน" /><em>ลิตร</em></div></label>
            <label className="field-label">ค่าน้ำมัน <small>(ไม่บังคับ)</small><div className="input-icon-wrap"><input type="number" min="0" step="0.01" value={fuelCost} onChange={(e) => setFuelCost(e.target.value)} placeholder="จำนวนเงิน" style={{ paddingLeft: 11 }} /><em>บาท</em></div></label>
          </div>
          <div className="form-footer modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button>
            <button className="primary-button" disabled={busy || offline}>{busy ? "กำลังบันทึก..." : "ยืนยันการกลับ"} <Check size={16} /></button>
          </div>
        </form>
      </section>
    </div>
  );
}
