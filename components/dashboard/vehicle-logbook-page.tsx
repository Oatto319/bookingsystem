"use client";

import { ArrowRight, CarFront, Clock3, Gauge, MapPin, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { VehicleBooking } from "@/types/booking";
import { dateLabel } from "./utils";
import { EmptyState, PanelHeading } from "./shared";

export function VehicleLogbookPage({
  bookings,
  onNavigate,
  onStartReturn,
}: {
  bookings: VehicleBooking[];
  onNavigate: () => void;
  onStartReturn: (booking: VehicleBooking) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return bookings.filter((booking) =>
      `${booking.vehicleName} ${booking.departureLog.destination} ${booking.departureLog.requester}`
        .toLowerCase()
        .includes(term),
    );
  }, [bookings, search]);

  return (
    <>
      <section className="panel logbook-panel">
        <PanelHeading title="สมุดบันทึกการเดินทาง" description="ติดตามการใช้รถและบันทึกข้อมูลเมื่อกลับถึงสำนักงาน" action={
          <div className="logbook-actions">
            <div className="search-field"><Search size={16} /><input aria-label="ค้นหารายการเดินทาง" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารถหรือปลายทาง" /></div>
            <button className="primary-button" onClick={onNavigate}><Plus size={16} /> ลงทะเบียนเดินทาง</button>
          </div>
        } />
        {filtered.length ? (
          <div className="logbook-list">
            {filtered.map((booking) => (
              <TripCard key={booking._id} booking={booking} onReturn={() => {
                onStartReturn(booking);
              }} />
            ))}
          </div>
        ) : <EmptyState text={search ? "ไม่พบรายการเดินทางที่ค้นหา" : "ยังไม่มีรายการเดินทาง เริ่มต้นด้วยการลงทะเบียนใช้รถ"} />}
      </section>
    </>
  );
}

function TripCard({ booking, onReturn }: { booking: VehicleBooking; onReturn: () => void }) {
  const isInUse = booking.status === "in_use";
  return (
    <article className="trip-card">
      <div className="trip-car-icon"><CarFront size={22} /></div>
      <div className="trip-main">
        <div className="trip-title">
          <h3>{booking.vehicleName}</h3>
          <span className={`status-pill ${isInUse ? "status-busy" : "status-free"}`}><b />{isInUse ? "กำลังเดินทาง" : "กลับถึงแล้ว"}</span>
        </div>
        <div className="trip-meta">
          <span><MapPin size={14} />{booking.departureLog.destination}</span>
          <span><Users size={14} />{booking.departureLog.requester}</span>
          <span><Clock3 size={14} />ออก {dateLabel(booking.departureLog.departedAt)}</span>
        </div>
        <div className="trip-odometer">
          <span>เริ่มต้น <strong>{booking.departureLog.startingOdometer.toLocaleString("th-TH")} กม.</strong></span>
          {booking.returnLog ? (
            <>
              <ArrowRight size={14} />
              <span>สิ้นสุด <strong>{booking.returnLog.endingOdometer.toLocaleString("th-TH")} กม.</strong></span>
              <span className="trip-total"><Gauge size={14} /> รวม <strong>{booking.totalDistance?.toLocaleString("th-TH")} กม.</strong></span>
            </>
          ) : <span className="waiting-return"><Clock3 size={14} /> รอข้อมูลขากลับ</span>}
        </div>
      </div>
      {isInUse && <button className="return-button" onClick={onReturn}>บันทึกขากลับ</button>}
    </article>
  );
}
