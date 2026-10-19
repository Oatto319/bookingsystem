"use client";

import { ArrowDownLeft, ArrowRight, Check, Gauge, X } from "lucide-react";
import { useEffect, type FormEvent } from "react";
import type { VehicleBooking } from "@/types/booking";

export function ReturnVehicleModal({
  booking,
  returnDate,
  endingOdometer,
  busy,
  onDateChange,
  onOdometerChange,
  onClose,
  onSubmit,
}: {
  booking: VehicleBooking;
  returnDate: string;
  endingOdometer: string;
  busy: boolean;
  onDateChange: (value: string) => void;
  onOdometerChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const distance = Math.max(
    Math.round((Number(endingOdometer || 0) - booking.departureLog.startingOdometer) * 10) / 10,
    0,
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="return-modal" role="dialog" aria-modal="true" aria-labelledby="return-title">
        <div className="modal-heading">
          <div className="modal-icon"><ArrowDownLeft size={20} /></div>
          <button className="icon-button" aria-label="ปิด" onClick={onClose}><X size={18} /></button>
        </div>
        <h2 id="return-title">บันทึกเมื่อกลับถึงสำนักงาน</h2>
        <p className="modal-description">{booking.vehicleName} · {booking.departureLog.destination}</p>
        <div className="distance-summary">
          <span>เลขไมล์เริ่มต้น<strong>{booking.departureLog.startingOdometer.toLocaleString("th-TH")} กม.</strong></span>
          <ArrowRight size={16} />
          <span>ระยะทางที่ใช้<strong>{distance.toLocaleString("th-TH")} กม.</strong></span>
        </div>
        <form className="booking-form" onSubmit={onSubmit}>
          <label className="field-label">วันและเวลากลับ <span>*</span><input type="datetime-local" value={returnDate} onChange={(event) => onDateChange(event.target.value)} required /></label>
          <label className="field-label">เลขไมล์สิ้นสุด <span>*</span>
            <div className="input-icon-wrap"><Gauge size={16} /><input type="number" min={booking.departureLog.startingOdometer} step="0.1" value={endingOdometer} onChange={(event) => onOdometerChange(event.target.value)} required /><em>กม.</em></div>
          </label>
          <div className="form-footer modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button>
            <button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "ยืนยันการกลับ"} <Check size={16} /></button>
          </div>
        </form>
      </section>
    </div>
  );
}
