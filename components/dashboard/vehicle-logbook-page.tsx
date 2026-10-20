"use client";

import { ArrowRight, CarFront, ChevronLeft, ChevronRight, Clock3, Download, Fuel, Gauge, MapPin, Plus, Printer, Search, TriangleAlert, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError, fetchLogbook, fetchMonthlySummary, logbookParams } from "@/lib/booking-api";
import type { LogbookQuery, LogbookResult, MonthlySummaryRow, SessionUser, Vehicle, VehicleBooking } from "@/types/booking";
import { dateLabel, isOverdue, number, toLocalInput } from "./utils";
import { EmptyState, PanelHeading } from "./shared";

const initialQuery: LogbookQuery = { status: "all", from: "", to: "", q: "", vehicleCode: "", page: 1 };

export function VehicleLogbookPage({
  vehicles,
  user,
  version,
  currentDate,
  offline,
  onNavigate,
  onStartReturn,
  onUnauthorized,
}: {
  vehicles: Vehicle[];
  user: SessionUser;
  version: number;
  currentDate: Date | null;
  offline: boolean;
  onNavigate: () => void;
  onStartReturn: (booking: VehicleBooking) => void;
  onUnauthorized: () => void;
}) {
  const [query, setQuery] = useState<LogbookQuery>(initialQuery);
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<{ key: string; data: LogbookResult } | null>(null);
  const [error, setError] = useState("");

  const queryKey = JSON.stringify(query);
  const loading = result === null || result.key !== queryKey;
  const update = (patch: Partial<LogbookQuery>) => setQuery((prev) => ({ ...prev, page: 1, ...patch }));

  // ค้นหาแบบหน่วงเวลาเล็กน้อย ไม่ยิง API ทุกตัวอักษร
  useEffect(() => {
    const timer = setTimeout(() => setQuery((prev) => (prev.q === searchText ? prev : { ...prev, q: searchText, page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  // โหลดใหม่เมื่อเปลี่ยนตัวกรอง/หน้า หรือเมื่อข้อมูลหลักรีเฟรช (เช่น หลังบันทึกขากลับ)
  useEffect(() => {
    let cancelled = false;
    fetchLogbook(JSON.parse(queryKey) as LogbookQuery)
      .then((data) => {
        if (cancelled) return;
        setResult({ key: queryKey, data });
        setError("");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
        else setError(caught instanceof Error ? caught.message : "โหลดข้อมูลไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, version, onUnauthorized]);

  const filterParams = logbookParams(query);
  const exportHref = `/api/vehicle-bookings/export?${filterParams}`;
  const hasFilter = query.status !== "all" || query.from || query.to || query.q || query.vehicleCode;
  const data = result?.data;

  return (
    <>
      <section className="panel logbook-panel">
        <PanelHeading
          title="สมุดบันทึกการเดินทาง"
          description="ติดตามการใช้รถและบันทึกข้อมูลเมื่อกลับถึงสำนักงาน"
          action={
            <div className="logbook-actions no-print">
              <a className="secondary-button" href={exportHref} download><Download size={15} /> ส่งออก CSV</a>
              <button className="secondary-button" onClick={() => window.print()}><Printer size={15} /> พิมพ์</button>
              <button className="primary-button" onClick={onNavigate}><Plus size={16} /> บันทึกการใช้รถ</button>
            </div>
          }
        />
        <div className="filter-bar no-print">
          <div className="search-field"><Search size={16} /><input aria-label="ค้นหารายการเดินทาง" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="ค้นหารถ ผู้ใช้ หรือปลายทาง" /></div>
          <select aria-label="กรองตามสถานะ" className="filter-select" value={query.status} onChange={(e) => update({ status: e.target.value as LogbookQuery["status"] })}>
            <option value="all">ทุกสถานะ</option>
            <option value="in_use">กำลังเดินทาง</option>
            <option value="returned">กลับถึงแล้ว</option>
          </select>
          <select aria-label="กรองตามรถ" className="filter-select" value={query.vehicleCode} onChange={(e) => update({ vehicleCode: e.target.value })}>
            <option value="">ทุกคัน</option>
            {vehicles.map((v) => <option key={v.code} value={v.code}>{v.name} · {v.registration}</option>)}
          </select>
          <label className="filter-date">ตั้งแต่<input type="date" value={query.from} max={query.to || undefined} onChange={(e) => update({ from: e.target.value })} /></label>
          <label className="filter-date">ถึง<input type="date" value={query.to} min={query.from || undefined} onChange={(e) => update({ to: e.target.value })} /></label>
          {hasFilter && <button className="text-button" onClick={() => { setSearchText(""); setQuery(initialQuery); }}>ล้างตัวกรอง</button>}
        </div>
        {error && <div className="notice notice-error" role="alert"><span>{error}</span></div>}
        {loading && !error ? (
          <div className="logbook-list" role="status" aria-label="กำลังโหลด">{[0, 1, 2].map((i) => <div key={i} className="skeleton skeleton-trip" />)}</div>
        ) : data && data.bookings.length ? (
          <>
            <div className="logbook-count">พบ {number(data.total)} รายการ</div>
            <div className="logbook-list">
              {data.bookings.map((booking) => (
                <TripCard
                  key={booking._id}
                  booking={booking}
                  overdue={isOverdue(booking, currentDate)}
                  canReturn={!offline && (user.role === "admin" || booking.createdBy === user.username)}
                  onReturn={() => onStartReturn(booking)}
                />
              ))}
            </div>
            <div className="pagination no-print">
              <button className="secondary-button" disabled={data.page <= 1} onClick={() => setQuery((p) => ({ ...p, page: p.page - 1 }))}><ChevronLeft size={15} /> ก่อนหน้า</button>
              <span>หน้า {data.page} / {data.pages}</span>
              <button className="secondary-button" disabled={data.page >= data.pages} onClick={() => setQuery((p) => ({ ...p, page: p.page + 1 }))}>ถัดไป <ChevronRight size={15} /></button>
            </div>
          </>
        ) : !error ? (
          <EmptyState text={hasFilter ? "ไม่พบรายการเดินทางตามตัวกรอง" : "ยังไม่มีรายการเดินทาง เริ่มต้นด้วยการบันทึกการใช้รถ"} />
        ) : null}
      </section>
      <MonthlySummary version={version} currentDate={currentDate} onUnauthorized={onUnauthorized} />
    </>
  );
}

function MonthlySummary({ version, currentDate, onUnauthorized }: { version: number; currentDate: Date | null; onUnauthorized: () => void }) {
  const [month, setMonth] = useState(() => toLocalInput(currentDate ?? new Date()).slice(0, 7));
  const [loaded, setLoaded] = useState<{ month: string; rows: MonthlySummaryRow[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!month) return;
    let cancelled = false;
    fetchMonthlySummary(month)
      .then((rows) => {
        if (cancelled) return;
        setLoaded({ month, rows });
        setError("");
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) onUnauthorized();
        else setError(caught instanceof Error ? caught.message : "โหลดสรุปไม่สำเร็จ");
      });
    return () => {
      cancelled = true;
    };
  }, [month, version, onUnauthorized]);

  const rows = loaded?.month === month ? loaded.rows : null;
  const totals = useMemo(
    () => (rows ?? []).reduce((acc, r) => ({ trips: acc.trips + r.trips, distance: acc.distance + r.distance, fuelLiters: acc.fuelLiters + r.fuelLiters, fuelCost: acc.fuelCost + r.fuelCost }), { trips: 0, distance: 0, fuelLiters: 0, fuelCost: 0 }),
    [rows],
  );

  return (
    <section className="panel logbook-panel summary-panel">
      <PanelHeading
        title="สรุประยะทางรายเดือนต่อคัน"
        description="นับตามเดือนที่ออกเดินทาง (เวลาประเทศไทย) · รวมเฉพาะทริปที่กลับถึงแล้ว"
        action={<label className="filter-date no-print">เดือน<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>}
      />
      {error ? (
        <div className="notice notice-error" role="alert"><span>{error}</span></div>
      ) : rows === null ? (
        <div className="skeleton skeleton-trip" role="status" aria-label="กำลังโหลด" />
      ) : rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>รถ</th><th>ทะเบียน</th><th>จำนวนทริป</th><th>ระยะทางรวม (กม.)</th><th>น้ำมัน (ลิตร)</th><th>ค่าน้ำมัน (บาท)</th></tr></thead>
            <tbody>
              {rows.map((r) => <tr key={r.vehicleCode}><td><strong>{r.vehicleName}</strong></td><td>{r.registration}</td><td>{number(r.trips)}</td><td>{number(r.distance)}</td><td>{number(r.fuelLiters)}</td><td>{number(r.fuelCost)}</td></tr>)}
              <tr className="row-total"><td colSpan={2}><strong>รวมทั้งหมด</strong></td><td>{number(totals.trips)}</td><td>{number(Math.round(totals.distance * 10) / 10)}</td><td>{number(Math.round(totals.fuelLiters * 100) / 100)}</td><td>{number(Math.round(totals.fuelCost * 100) / 100)}</td></tr>
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="เดือนนี้ยังไม่มีการเดินทาง" />}
    </section>
  );
}

function TripCard({ booking, overdue, canReturn, onReturn }: { booking: VehicleBooking; overdue: boolean; canReturn: boolean; onReturn: () => void }) {
  const isInUse = booking.status === "in_use";
  const { departureLog: log, returnLog } = booking;
  return (
    <article className={`trip-card ${overdue ? "is-late" : ""}`}>
      <div className="trip-car-icon"><CarFront size={22} /></div>
      <div className="trip-main">
        <div className="trip-title">
          <h3>{booking.vehicleName} <small>{booking.registration}</small></h3>
          <span className={`status-pill ${overdue ? "status-late" : isInUse ? "status-busy" : "status-free"}`}><b />{overdue ? "เกินกำหนดคืน" : isInUse ? "กำลังเดินทาง" : "กลับถึงแล้ว"}</span>
        </div>
        <div className="trip-meta">
          <span><MapPin size={14} />{log.destination}</span>
          <span><Users size={14} />{log.requester}{log.driver ? ` · ขับโดย ${log.driver}` : ""}{log.passengers ? ` · ผู้โดยสาร ${log.passengers}` : ""}</span>
          <span><Clock3 size={14} />ออก {dateLabel(log.departedAt)}</span>
          {returnLog && <span><Clock3 size={14} />กลับ {dateLabel(returnLog.returnedAt)}</span>}
        </div>
        {log.purpose && <div className="trip-purpose">วัตถุประสงค์: {log.purpose}</div>}
        <div className="trip-odometer">
          <span>เริ่มต้น <strong>{number(log.startingOdometer)} กม.</strong></span>
          {returnLog ? (
            <>
              <ArrowRight size={14} />
              <span>สิ้นสุด <strong>{number(returnLog.endingOdometer)} กม.</strong></span>
              <span className="trip-total"><Gauge size={14} /> รวม <strong>{number(booking.totalDistance)} กม.</strong></span>
              {returnLog.fuelLiters ? <span className="trip-total"><Fuel size={14} /> <strong>{number(returnLog.fuelLiters)} ลิตร</strong>{returnLog.fuelCost ? ` · ${number(returnLog.fuelCost)} บาท` : ""}</span> : null}
            </>
          ) : <span className="waiting-return">{overdue ? <TriangleAlert size={14} /> : <Clock3 size={14} />} {overdue ? "เกินเวลาที่กำหนด รอข้อมูลขากลับ" : "รอข้อมูลขากลับ"}</span>}
        </div>
      </div>
      {isInUse && canReturn && <button className="return-button no-print" onClick={onReturn}>บันทึกขากลับ</button>}
    </article>
  );
}
