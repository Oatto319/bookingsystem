"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { MeetingBooking, Room, SessionUser } from "@/types/booking";
import { dateLabel, timeLabel } from "./utils";

const START_HOUR = 7;
const END_HOUR = 20;
const SLOT_MIN = 30;
const SLOT_HEIGHT = 24; // px
const SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN;
const MS_MIN = 60_000;

export type SlotSelection = { roomCode: string; start: Date; end: Date };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const mondayOf = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const inputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function canManageBooking(booking: MeetingBooking, user: SessionUser, now: Date | null) {
  const owner = user.role === "admin" || booking.requesterId === user.username;
  return owner && now !== null && new Date(booking.endAt) > now;
}

type ColumnProps = {
  day: Date;
  room: Room;
  bookings: MeetingBooking[];
  now: Date;
  user: SessionUser;
  selection: SlotSelection | null;
  inspectedId: string | null;
  onPick: (selection: SlotSelection) => void;
  onInspect: (booking: MeetingBooking) => void;
};

function TimelineColumn({ day, room, bookings, now, user, selection, inspectedId, onPick, onInspect }: ColumnProps) {
  const open = new Date(day.getFullYear(), day.getMonth(), day.getDate(), START_HOUR).getTime();
  const close = new Date(day.getFullYear(), day.getMonth(), day.getDate(), END_HOUR).getTime();
  const dayBookings = bookings.filter(
    (b) => new Date(b.startAt).getTime() < close && new Date(b.endAt).getTime() > open,
  );
  const px = (time: number) => ((Math.min(Math.max(time, open), close) - open) / (SLOT_MIN * MS_MIN)) * SLOT_HEIGHT;

  function pick(slotStart: number) {
    // เติมเวลา 1 ชม. แต่ไม่ให้ทับรายการถัดไป และไม่เกินเวลาปิด
    const nextStart = dayBookings
      .map((b) => new Date(b.startAt).getTime())
      .filter((t) => t > slotStart)
      .sort((a, b) => a - b)[0];
    const end = Math.min(slotStart + 60 * MS_MIN, close, nextStart ?? Infinity);
    onPick({ roomCode: room.code, start: new Date(slotStart), end: new Date(Math.max(end, slotStart + SLOT_MIN * MS_MIN)) });
  }

  const nowOffset = sameDay(day, now) && now.getTime() > open && now.getTime() < close ? px(now.getTime()) : null;
  const selected =
    selection && selection.roomCode === room.code && sameDay(selection.start, day) ? selection : null;

  return (
    <div className="cal-col" style={{ height: SLOTS * SLOT_HEIGHT }}>
      {Array.from({ length: SLOTS }, (_, index) => {
        const slotStart = open + index * SLOT_MIN * MS_MIN;
        const slotEnd = slotStart + SLOT_MIN * MS_MIN;
        const taken = dayBookings.some(
          (b) => new Date(b.startAt).getTime() < slotEnd && new Date(b.endAt).getTime() > slotStart,
        );
        const past = slotEnd <= now.getTime();
        return (
          <button
            key={slotStart}
            type="button"
            className={`cal-slot ${index % 2 === 0 ? "is-hour" : ""}`}
            disabled={taken || past}
            aria-label={`จอง ${room.name} ${dateLabel(new Date(slotStart).toISOString())}`}
            onClick={() => pick(slotStart)}
          />
        );
      })}
      {selected && (
        <div className="cal-selection" style={{ top: px(selected.start.getTime()), height: px(selected.end.getTime()) - px(selected.start.getTime()) }} />
      )}
      {dayBookings.map((booking) => {
        const top = px(new Date(booking.startAt).getTime());
        const height = px(new Date(booking.endAt).getTime()) - top;
        const mine = booking.requesterId === user.username;
        return (
          <button
            key={booking._id}
            type="button"
            className={`cal-event room-${room.color} ${mine ? "is-mine" : ""} ${inspectedId === booking._id ? "is-active" : ""}`}
            style={{ top, height: Math.max(height, 14) }}
            title={`${booking.topic} · ${booking.requester}`}
            onClick={() => onInspect(booking)}
          >
            <strong>{booking.topic}</strong>
            {height >= 34 && <span>{timeLabel(booking.startAt)}–{timeLabel(booking.endAt)} · {booking.requester}</span>}
          </button>
        );
      })}
      {nowOffset !== null && <div className="cal-now" style={{ top: nowOffset }} aria-hidden="true" />}
    </div>
  );
}

export function RoomCalendar({
  rooms,
  bookings,
  currentDate,
  user,
  selection,
  busy,
  onPick,
  onEdit,
  onCancel,
}: {
  rooms: Room[];
  bookings: MeetingBooking[];
  currentDate: Date | null;
  user: SessionUser;
  selection: SlotSelection | null;
  busy: boolean;
  onPick: (selection: SlotSelection) => void;
  onEdit: (booking: MeetingBooking) => void;
  onCancel: (booking: MeetingBooking) => void;
}) {
  const [mode, setMode] = useState<"day" | "week">("day");
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [weekRoomCode, setWeekRoomCode] = useState("");
  const [inspected, setInspected] = useState<MeetingBooking | null>(null);

  const now = currentDate;
  const day = anchor ?? (now ? startOfDay(now) : null);
  const weekRoom = rooms.find((room) => room.code === weekRoomCode) ?? rooms[0];

  const byRoom = useMemo(() => {
    const map = new Map<string, MeetingBooking[]>();
    for (const booking of bookings) {
      map.set(booking.roomCode, [...(map.get(booking.roomCode) ?? []), booking]);
    }
    return map;
  }, [bookings]);

  if (!day || !now) return null;

  const weekStart = mondayOf(day);
  const columns =
    mode === "day"
      ? rooms.map((room) => ({ key: room.code, title: room.name, sub: `${room.capacity} ที่นั่ง`, room, date: day }))
      : weekRoom
        ? Array.from({ length: 7 }, (_, index) => {
            const date = addDays(weekStart, index);
            return {
              key: inputDate(date),
              title: new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short" }).format(date),
              sub: sameDay(date, now) ? "วันนี้" : "",
              room: weekRoom,
              date,
            };
          })
        : [];

  const step = mode === "day" ? 1 : 7;
  const heading =
    mode === "day"
      ? new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(day)
      : `${new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(weekStart)} – ${new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(addDays(weekStart, 6))}`;
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);

  return (
    <section className="panel calendar-panel" id="room-calendar">
      <div className="panel-heading">
        <div>
          <h2>ปฏิทินห้องประชุม</h2>
          <p>ดูช่วงเวลาที่ว่างก่อนจอง — คลิกช่องว่างเพื่อเติมเวลาลงฟอร์มอัตโนมัติ</p>
        </div>
        <div className="cal-toolbar">
          <div className="segmented" role="group" aria-label="มุมมองปฏิทิน">
            <button type="button" aria-pressed={mode === "day"} className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>รายวัน</button>
            <button type="button" aria-pressed={mode === "week"} className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>รายสัปดาห์</button>
          </div>
          {mode === "week" && weekRoom && (
            <select aria-label="เลือกห้อง" className="cal-select" value={weekRoom.code} onChange={(e) => setWeekRoomCode(e.target.value)}>
              {rooms.map((room) => <option key={room.code} value={room.code}>{room.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="cal-nav">
        <button type="button" className="icon-button" aria-label={mode === "day" ? "วันก่อนหน้า" : "สัปดาห์ก่อนหน้า"} onClick={() => setAnchor(addDays(day, -step))}><ChevronLeft size={16} /></button>
        <strong className="cal-heading"><CalendarDays size={15} /> {heading}</strong>
        <button type="button" className="icon-button" aria-label={mode === "day" ? "วันถัดไป" : "สัปดาห์ถัดไป"} onClick={() => setAnchor(addDays(day, step))}><ChevronRight size={16} /></button>
        <button type="button" className="secondary-button" onClick={() => setAnchor(null)}>วันนี้</button>
        <input type="date" aria-label="ไปยังวันที่" className="cal-date" value={inputDate(day)} onChange={(e) => e.target.value && setAnchor(new Date(`${e.target.value}T00:00:00`))} />
      </div>

      <div className="cal-scroll">
        <div className="cal-grid" style={{ gridTemplateColumns: `52px repeat(${Math.max(columns.length, 1)}, minmax(120px, 1fr))` }}>
          <div className="cal-corner" />
          {columns.map((column) => (
            <div className="cal-head" key={column.key}><strong>{column.title}</strong><small>{column.sub}</small></div>
          ))}
          <div className="cal-axis" style={{ height: SLOTS * SLOT_HEIGHT }}>
            {hours.map((hour) => (
              <span key={hour} style={{ top: (hour - START_HOUR) * 2 * SLOT_HEIGHT }}>{String(hour).padStart(2, "0")}:00</span>
            ))}
          </div>
          {columns.map((column) => (
            <TimelineColumn
              key={column.key}
              day={column.date}
              room={column.room}
              bookings={byRoom.get(column.room.code) ?? []}
              now={now}
              user={user}
              selection={selection}
              inspectedId={inspected?._id ?? null}
              onPick={onPick}
              onInspect={setInspected}
            />
          ))}
        </div>
      </div>

      <div className="cal-legend">
        <span><i className="legend-free" /> ว่าง (คลิกเพื่อจอง)</span>
        <span><i className="legend-busy" /> จองแล้ว</span>
        <span><i className="legend-mine" /> การจองของฉัน</span>
        <span><i className="legend-now" /> เวลาปัจจุบัน</span>
      </div>

      {inspected && (
        <div className="cal-detail" role="region" aria-label="รายละเอียดการจอง">
          <div>
            <strong>{inspected.topic}</strong>
            <p>{inspected.roomName} · {dateLabel(inspected.startAt)} – {timeLabel(inspected.endAt)} · {inspected.attendees} คน</p>
            <p>ผู้จอง: {inspected.requester}{inspected.department ? ` · ${inspected.department}` : ""}{inspected.phone ? ` · โทร ${inspected.phone}` : ""}</p>
          </div>
          <div className="cal-detail-actions">
            {canManageBooking(inspected, user, now) && (
              <>
                <button type="button" className="secondary-button" onClick={() => { onEdit(inspected); setInspected(null); }}><Pencil size={14} /> แก้ไข</button>
                <button type="button" className="secondary-button danger" disabled={busy} onClick={() => { onCancel(inspected); setInspected(null); }}><Trash2 size={14} /> ยกเลิกการจอง</button>
              </>
            )}
            <button type="button" className="icon-button" aria-label="ปิดรายละเอียด" onClick={() => setInspected(null)}><X size={16} /></button>
          </div>
        </div>
      )}
    </section>
  );
}
