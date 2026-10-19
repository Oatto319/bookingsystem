"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  DoorOpen,
  Gauge,
  Leaf,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Room = {
  code: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  color: string;
};

type Vehicle = {
  code: string;
  name: string;
  registration: string;
  seats: number;
  type: string;
};

type MeetingBooking = {
  _id: string;
  roomCode: string;
  roomName: string;
  startAt: string;
  endAt: string;
  topic: string;
  attendees: number;
  requester: string;
};

type VehicleBooking = {
  _id: string;
  vehicleCode: string;
  vehicleName: string;
  registration: string;
  status: "in_use" | "returned";
  departureLog: {
    departedAt: string;
    requester: string;
    destination: string;
    startingOdometer: number;
    driver: string;
    note?: string;
  };
  returnLog?: { returnedAt: string; endingOdometer: number } | null;
  totalDistance?: number | null;
};

type View = "overview" | "meeting" | "vehicle" | "logbook";

const sampleRooms: Room[] = [
  {
    code: "room-nara",
    name: "ห้องประชุมรวงข้าว",
    capacity: 12,
    location: "อาคารสำนักงาน ชั้น 2",
    amenities: ["จอแสดงผล", "กระดานไวท์บอร์ด"],
    color: "sage",
  },
  {
    code: "room-suan",
    name: "ห้องประชุมเกษตรก้าวหน้า",
    capacity: 24,
    location: "อาคารสำนักงาน ชั้น 3",
    amenities: ["โปรเจกเตอร์", "ระบบประชุมทางไกล"],
    color: "blue",
  },
  {
    code: "room-rimnam",
    name: "ห้องประชุมริมคลอง",
    capacity: 8,
    location: "อาคารสำนักงาน ชั้น 1",
    amenities: ["จอแสดงผล"],
    color: "amber",
  },
];

const sampleVehicles: Vehicle[] = [
  {
    code: "car-pickup",
    name: "รถกระบะ 4 ประตู",
    registration: "กษ 4521",
    seats: 5,
    type: "pickup",
  },
  {
    code: "car-van",
    name: "รถตู้สำนักงาน",
    registration: "นข 2084",
    seats: 11,
    type: "van",
  },
  {
    code: "car-sedan",
    name: "รถยนต์ส่วนกลาง",
    registration: "กษ 3190",
    seats: 5,
    type: "sedan",
  },
];

function localDateTime(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data;
}

async function fetchDashboardData() {
  const [catalogResponse, meetingResponse, vehicleResponse] = await Promise.all([
    fetch("/api/catalog"),
    fetch("/api/meeting-bookings"),
    fetch("/api/vehicle-bookings"),
  ]);
  const [catalog, meetings, vehicleData] = await Promise.all([
    readResponse<{ rooms: Room[]; vehicles: Vehicle[] }>(catalogResponse),
    readResponse<{ bookings: MeetingBooking[] }>(meetingResponse),
    readResponse<{ bookings: VehicleBooking[] }>(vehicleResponse),
  ]);
  return { catalog, meetings, vehicleData };
}

export default function BookingDashboard() {
  const [view, setView] = useState<View>("overview");
  const [rooms, setRooms] = useState<Room[]>(sampleRooms);
  const [vehicles, setVehicles] = useState<Vehicle[]>(sampleVehicles);
  const [meetingBookings, setMeetingBookings] = useState<MeetingBooking[]>([]);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [returningBooking, setReturningBooking] = useState<VehicleBooking | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const [endingOdometer, setEndingOdometer] = useState("");
  const [search, setSearch] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { catalog, meetings, vehicleData } = await fetchDashboardData();
      setRooms(catalog.rooms);
      setVehicles(catalog.vehicles);
      setMeetingBookings(meetings.bookings);
      setVehicleBookings(vehicleData.bookings);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const clock = setTimeout(() => {
      if (!cancelled) setCurrentDate(new Date());
    }, 0);
    void fetchDashboardData()
      .then(({ catalog, meetings, vehicleData }) => {
        if (cancelled) return;
        setRooms(catalog.rooms);
        setVehicles(catalog.vehicles);
        setMeetingBookings(meetings.bookings);
        setVehicleBookings(vehicleData.bookings);
        setOffline(false);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(clock);
    };
  }, []);

  const inUseCount = vehicleBookings.filter((booking) => booking.status === "in_use").length;
  const todayBookings = meetingBookings.filter(
    (booking) =>
      currentDate !== null &&
      new Date(booking.startAt).toDateString() === currentDate.toDateString(),
  );
  const upcomingMeetings = [...meetingBookings]
    .filter((booking) => currentDate !== null && new Date(booking.endAt) >= currentDate)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  const occupiedRoomCodes = useMemo(() => {
    if (!currentDate) return new Set<string>();
    return new Set(
      meetingBookings
        .filter(
          (booking) =>
            new Date(booking.startAt) <= currentDate && new Date(booking.endAt) > currentDate,
        )
        .map((booking) => booking.roomCode),
    );
  }, [currentDate, meetingBookings]);

  async function submitMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage(null);
    try {
      await readResponse(
        await fetch("/api/meeting-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: form.get("roomCode"),
            startAt: new Date(String(form.get("startAt"))).toISOString(),
            endAt: new Date(String(form.get("endAt"))).toISOString(),
            topic: form.get("topic"),
            attendees: Number(form.get("attendees")),
            requester: form.get("requester"),
          }),
        }),
      );
      setMessage({ type: "success", text: "บันทึกการจองห้องประชุมเรียบร้อยแล้ว" });
      formElement.reset();
      await refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "บันทึกการจองไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitDeparture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage(null);
    try {
      await readResponse(
        await fetch("/api/vehicle-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleCode: form.get("vehicleCode"),
            departedAt: new Date(String(form.get("departedAt"))).toISOString(),
            requester: form.get("requester"),
            destination: form.get("destination"),
            startingOdometer: Number(form.get("startingOdometer")),
            driver: form.get("driver"),
            note: form.get("note"),
          }),
        }),
      );
      setMessage({ type: "success", text: "บันทึกข้อมูลออกเดินทางแล้ว ขอให้เดินทางปลอดภัย" });
      formElement.reset();
      await refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "บันทึกข้อมูลออกเดินทางไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returningBooking) return;
    setBusy(true);
    setMessage(null);
    try {
      await readResponse(
        await fetch(`/api/vehicle-bookings/${returningBooking._id}/return`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnedAt: new Date(returnDate).toISOString(),
            endingOdometer: Number(endingOdometer),
          }),
        }),
      );
      setReturningBooking(null);
      setEndingOdometer("");
      setMessage({ type: "success", text: "บันทึกการกลับถึงสำนักงานและคำนวณระยะทางแล้ว" });
      await refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "บันทึกข้อมูลขากลับไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  const navItems: { key: View; label: string; icon: typeof CalendarDays }[] = [
    { key: "overview", label: "ภาพรวม", icon: Settings2 },
    { key: "meeting", label: "จองห้องประชุม", icon: DoorOpen },
    { key: "vehicle", label: "จองรถสำนักงาน", icon: CarFront },
    { key: "logbook", label: "สมุดบันทึกการเดินทาง", icon: MapPin },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setView("overview")}>
          <span className="brand-mark"><Leaf size={21} strokeWidth={2.1} /></span>
          <span className="brand-copy">
            <strong>เกษตรพร้อม</strong>
            <small>สำนักงานเกษตรจังหวัด</small>
          </span>
        </a>

        <div className="side-label">เมนูหลัก</div>
        <nav className="side-nav" aria-label="เมนูหลัก">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              className={`nav-item ${view === key ? "active" : ""}`}
              key={key}
              onClick={() => {
                setView(key);
                setMobileNavOpen(false);
                setMessage(null);
              }}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {key === "vehicle" && inUseCount > 0 && <span className="nav-count">{inUseCount}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <div>
              <strong>ต้องการความช่วยเหลือ?</strong>
              <p>ติดต่อฝ่ายบริหารทั่วไป</p>
            </div>
            <ArrowRight size={15} />
          </div>
          <div className="profile">
            <div className="avatar">สก</div>
            <div className="profile-copy">
              <strong>สำนักงานเกษตร</strong>
              <small>ผู้ดูแลระบบ</small>
            </div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>ระบบจัดการสำนักงาน</span>
            <span className="crumb-separator">/</span>
            <strong>{navItems.find((item) => item.key === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="date-pill"><CalendarDays size={16} />{currentDate ? dateLabel(currentDate.toISOString(), { timeStyle: undefined }) : "กำลังโหลดวันที่..."}</div>
            <button className="icon-button" aria-label="การแจ้งเตือน"><Bell size={18} /><i /></button>
            <button className="mobile-menu" aria-label={mobileNavOpen ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          </div>
        </header>
        {mobileNavOpen && (
          <nav className="mobile-nav" aria-label="เมนูหลัก">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button key={key} className={view === key ? "active" : ""} onClick={() => {
                setView(key);
                setMobileNavOpen(false);
                setMessage(null);
              }}>
                <Icon size={17} />{label}
                {key === "vehicle" && inUseCount > 0 && <span className="nav-count">{inUseCount}</span>}
              </button>
            ))}
          </nav>
        )}

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> ระบบจองทรัพยากรสำนักงาน</div>
              <h1>{view === "overview" ? "สวัสดีตอนเช้า 🌿" : navItems.find((item) => item.key === view)?.label}</h1>
              <p className="page-subtitle">
                {view === "overview"
                  ? "พร้อมเริ่มต้นวันทำงานที่ราบรื่นของคุณแล้วหรือยัง?"
                  : "จัดการการใช้งานทรัพยากรสำนักงานได้ในที่เดียว"}
              </p>
            </div>
            <button className="primary-button" onClick={() => setView("meeting")}>
              <Plus size={17} /> สร้างรายการจอง
            </button>
          </div>

          {offline && (
            <div className="notice notice-warning">
              <CircleHelp size={17} />
              <span>กำลังแสดงข้อมูลตัวอย่าง — ตั้งค่า <code>MONGODB_URI</code> และเชื่อมต่อ MongoDB เพื่อบันทึกข้อมูลจริง</span>
              <button aria-label="ปิดข้อความ" onClick={() => setOffline(false)}><X size={16} /></button>
            </div>
          )}
          {message && (
            <div className={`notice ${message.type === "success" ? "notice-success" : "notice-error"}`}>
              {message.type === "success" ? <Check size={17} /> : <CircleHelp size={17} />}
              <span>{message.text}</span>
              <button aria-label="ปิดข้อความ" onClick={() => setMessage(null)}><X size={16} /></button>
            </div>
          )}

          {view === "overview" && (
            <>
              <div className="stats-grid">
                <StatCard icon={<DoorOpen size={19} />} tone="green" label="ห้องประชุมทั้งหมด" value={String(rooms.length)} suffix="ห้อง" detail={`${occupiedRoomCodes.size} ห้องกำลังใช้งาน`} />
                <StatCard icon={<CalendarDays size={19} />} tone="blue" label="การจองวันนี้" value={String(todayBookings.length)} suffix="รายการ" detail="ห้องประชุม" />
                <StatCard icon={<CarFront size={19} />} tone="orange" label="รถที่พร้อมใช้งาน" value={String(Math.max(vehicles.length - inUseCount, 0))} suffix={`/ ${vehicles.length} คัน`} detail={`${inUseCount} คันกำลังเดินทาง`} />
                <StatCard icon={<Gauge size={19} />} tone="purple" label="รายการเดินทาง" value={String(vehicleBookings.length)} suffix="รายการ" detail="บันทึกในสมุดเดินทาง" />
              </div>

              <div className="dashboard-grid">
                <section className="panel meeting-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>ห้องประชุม</h2>
                      <p>ตรวจสอบห้องและสถานะการใช้งาน</p>
                    </div>
                    <button className="text-button" onClick={() => setView("meeting")}>ดูทั้งหมด <ArrowRight size={15} /></button>
                  </div>
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
                          <span className={`status-pill ${occupied ? "status-busy" : "status-free"}`}>
                            <b />{occupied ? "กำลังใช้งาน" : "ว่าง"}
                          </span>
                          {index < rooms.length - 1 && <span className="room-divider" />}
                        </div>
                      );
                    })}
                    {rooms.length === 0 && <EmptyState text="ยังไม่มีข้อมูลห้องประชุม" />}
                  </div>
                </section>

                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div><h2>ทำรายการด่วน</h2><p>เริ่มจองทรัพยากรของคุณ</p></div>
                    <span className="sparkle">✳</span>
                  </div>
                  <button className="quick-action" onClick={() => setView("meeting")}>
                    <span className="quick-icon quick-green"><DoorOpen size={19} /></span>
                    <span><strong>จองห้องประชุม</strong><small>เลือกห้องและช่วงเวลาที่ต้องการ</small></span>
                    <ArrowRight size={16} />
                  </button>
                  <button className="quick-action" onClick={() => setView("vehicle")}>
                    <span className="quick-icon quick-orange"><CarFront size={19} /></span>
                    <span><strong>จองรถสำนักงาน</strong><small>บันทึกข้อมูลการเดินทางล่วงหน้า</small></span>
                    <ArrowRight size={16} />
                  </button>
                  <div className="quick-tip"><Leaf size={15} /><span>อย่าลืมลงเลขไมล์เมื่อรับรถและกลับถึงสำนักงาน</span></div>
                </section>
              </div>

              <section className="panel upcoming-panel">
                <div className="panel-heading">
                  <div><h2>การประชุมที่กำลังจะมาถึง</h2><p>รายการจองห้องประชุมล่าสุด</p></div>
                  <button className="text-button" onClick={() => setView("meeting")}>ดูปฏิทิน <ArrowRight size={15} /></button>
                </div>
                {upcomingMeetings.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>หัวข้อการประชุม</th><th>ห้องประชุม</th><th>วันและเวลา</th><th>ผู้เข้าร่วม</th><th>ผู้จอง</th></tr></thead>
                      <tbody>{upcomingMeetings.map((booking) => (
                        <tr key={booking._id}>
                          <td><strong>{booking.topic}</strong></td>
                          <td>{booking.roomName}</td>
                          <td>{dateLabel(booking.startAt)}</td>
                          <td>{booking.attendees} คน</td>
                          <td>{booking.requester}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <EmptyState text="ยังไม่มีรายการประชุมที่กำลังจะมาถึง" />}
              </section>
            </>
          )}

          {view === "meeting" && (
            <div className="form-layout">
              <section className="panel form-panel">
                <div className="panel-heading">
                  <div><h2>ข้อมูลการจองห้องประชุม</h2><p>กรอกรายละเอียดการใช้ห้องให้ครบถ้วน</p></div>
                  <span className="step-chip"><span>01</span> รายละเอียดการจอง</span>
                </div>
                <form className="booking-form" onSubmit={submitMeeting}>
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
                    <label className="field-label">วันและเวลาเริ่มต้น <span>*</span>
                      <input name="startAt" type="datetime-local" required />
                    </label>
                    <label className="field-label">วันและเวลาสิ้นสุด <span>*</span>
                      <input name="endAt" type="datetime-local" required />
                    </label>
                  </div>
                  <div className="form-row">
                    <label className="field-label">จำนวนผู้เข้าร่วม <span>*</span>
                      <div className="input-icon-wrap"><Users size={16} /><input name="attendees" type="number" min="1" required placeholder="เช่น 8" /></div>
                    </label>
                    <label className="field-label">ชื่อผู้ขอจอง <span>*</span>
                      <input name="requester" required maxLength={100} placeholder="ชื่อ - นามสกุล" />
                    </label>
                  </div>
                  <div className="form-footer"><span><i /> ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</span><button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "ยืนยันการจอง"} <ArrowRight size={16} /></button></div>
                </form>
              </section>
              <aside className="panel side-info-panel">
                <div className="panel-heading"><div><h2>ห้องประชุม</h2><p>สถานะปัจจุบัน</p></div><span className="live-indicator"><i /> สด</span></div>
                <div className="compact-rooms">{rooms.map((room) => (
                  <div className="compact-room" key={room.code}>
                    <div className={`room-icon room-${room.color}`}><DoorOpen size={18} /></div>
                    <div><strong>{room.name}</strong><span>{room.capacity} ที่นั่ง · {room.location}</span></div>
                    <span className={`status-dot ${occupiedRoomCodes.has(room.code) ? "is-busy" : ""}`} title={occupiedRoomCodes.has(room.code) ? "กำลังใช้งาน" : "ว่าง"} />
                  </div>
                ))}</div>
                <div className="info-note"><Clock3 size={16} /><span>ระบบจะตรวจสอบช่วงเวลาซ้ำให้อัตโนมัติ ก่อนยืนยันการจอง</span></div>
              </aside>
            </div>
          )}

          {view === "vehicle" && (
            <div className="form-layout vehicle-layout">
              <section className="panel form-panel">
                <div className="panel-heading">
                  <div><h2>ข้อมูลก่อนออกเดินทาง</h2><p>ระยะที่ 1 · กรอกข้อมูลและเลขไมล์ก่อนนำรถออก</p></div>
                  <span className="step-chip"><span>01</span> Departure log</span>
                </div>
                <div className="phase-progress"><div className="phase active"><b>1</b><span>ก่อนออกเดินทาง</span></div><i /><div className="phase"><b>2</b><span>เมื่อกลับถึงสำนักงาน</span></div></div>
                <form className="booking-form" onSubmit={submitDeparture}>
                  <label className="field-label">เลือกรถสำนักงาน <span>*</span>
                    <select name="vehicleCode" required defaultValue="">
                      <option value="" disabled>เลือกรถที่ต้องการใช้</option>
                      {vehicles.map((vehicle) => {
                        const inUse = vehicleBookings.some((booking) => booking.vehicleCode === vehicle.code && booking.status === "in_use");
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
                  <label className="field-label">เลขไมล์เริ่มต้น <span>*</span>
                    <div className="input-icon-wrap"><Gauge size={16} /><input name="startingOdometer" type="number" min="0" step="0.1" required placeholder="เลขไมล์หน้าปัดก่อนออกเดินทาง" /><em>กม.</em></div>
                  </label>
                  <label className="field-label">หมายเหตุ <small>(ไม่บังคับ)</small><textarea name="note" rows={3} maxLength={500} placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับการเดินทาง" /></label>
                  <div className="form-footer"><span><i /> กรอกเลขไมล์ตามหน้าปัดรถก่อนออกเดินทาง</span><button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึกก่อนออกเดินทาง"} <ArrowRight size={16} /></button></div>
                </form>
              </section>
              <aside className="panel side-info-panel">
                <div className="panel-heading"><div><h2>รถสำนักงาน</h2><p>รถที่มีในระบบ</p></div><span className="live-indicator"><i /> {vehicles.length} คัน</span></div>
                <div className="vehicle-list">{vehicles.map((vehicle) => {
                  const inUse = vehicleBookings.some((booking) => booking.vehicleCode === vehicle.code && booking.status === "in_use");
                  return <div className="vehicle-card" key={vehicle.code}>
                    <div className="vehicle-art"><CarFront size={26} /></div>
                    <div className="vehicle-copy"><strong>{vehicle.name}</strong><span>{vehicle.registration} · {vehicle.seats} ที่นั่ง</span></div>
                    <span className={`status-pill ${inUse ? "status-busy" : "status-free"}`}><b />{inUse ? "ใช้งาน" : "พร้อม"}</span>
                  </div>;
                })}</div>
                <div className="distance-note"><span className="distance-icon"><Gauge size={18} /></span><div><strong>ระบบคำนวณระยะทางอัตโนมัติ</strong><p>ระยะทางรวม = เลขไมล์สิ้นสุด − เลขไมล์เริ่มต้น</p></div></div>
              </aside>
            </div>
          )}

          {view === "logbook" && (
            <section className="panel logbook-panel">
              <div className="panel-heading">
                <div><h2>สมุดบันทึกการเดินทาง</h2><p>ติดตามการใช้รถและบันทึกข้อมูลเมื่อกลับถึงสำนักงาน</p></div>
                <div className="logbook-actions"><div className="search-field"><Search size={16} /><input aria-label="ค้นหารายการเดินทาง" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหารถหรือปลายทาง" /></div><button className="primary-button" onClick={() => setView("vehicle")}><Plus size={16} /> ลงทะเบียนเดินทาง</button></div>
              </div>
              {vehicleBookings.length ? (
                <div className="logbook-list">{vehicleBookings.filter((booking) => `${booking.vehicleName} ${booking.departureLog.destination} ${booking.departureLog.requester}`.toLowerCase().includes(search.toLowerCase())).map((booking) => (
                  <article className="trip-card" key={booking._id}>
                    <div className="trip-car-icon"><CarFront size={22} /></div>
                    <div className="trip-main">
                      <div className="trip-title"><h3>{booking.vehicleName}</h3><span className={`status-pill ${booking.status === "in_use" ? "status-busy" : "status-free"}`}><b />{booking.status === "in_use" ? "กำลังเดินทาง" : "กลับถึงแล้ว"}</span></div>
                      <div className="trip-meta"><span><MapPin size={14} />{booking.departureLog.destination}</span><span><Users size={14} />{booking.departureLog.requester}</span><span><Clock3 size={14} />ออก {dateLabel(booking.departureLog.departedAt)}</span></div>
                      <div className="trip-odometer"><span>เริ่มต้น <strong>{booking.departureLog.startingOdometer.toLocaleString("th-TH")} กม.</strong></span>{booking.returnLog ? <><ArrowRight size={14} /><span>สิ้นสุด <strong>{booking.returnLog.endingOdometer.toLocaleString("th-TH")} กม.</strong></span><span className="trip-total"><Gauge size={14} /> รวม <strong>{booking.totalDistance?.toLocaleString("th-TH")} กม.</strong></span></> : <span className="waiting-return"><Clock3 size={14} /> รอข้อมูลขากลับ</span>}</div>
                    </div>
                    {booking.status === "in_use" && <button className="return-button" onClick={() => {
                      setReturningBooking(booking);
                      setReturnDate(localDateTime());
                      setEndingOdometer(String(booking.departureLog.startingOdometer));
                    }}><ArrowDownLeft size={16} /> บันทึกขากลับ</button>}
                  </article>
                ))}</div>
              ) : <EmptyState text="ยังไม่มีรายการเดินทาง เริ่มต้นด้วยการลงทะเบียนใช้รถ" />}
            </section>
          )}

          <footer className="page-footer"><span>© 2568 สำนักงานเกษตรจังหวัด</span><span>ระบบบริหารจัดการทรัพยากรภายในสำนักงาน</span></footer>
        </section>
      </main>

      {returningBooking && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setReturningBooking(null);
        }}>
          <section className="return-modal" role="dialog" aria-modal="true" aria-labelledby="return-title">
            <div className="modal-heading"><div className="modal-icon"><ArrowDownLeft size={20} /></div><button className="icon-button" aria-label="ปิด" onClick={() => setReturningBooking(null)}><X size={18} /></button></div>
            <h2 id="return-title">บันทึกเมื่อกลับถึงสำนักงาน</h2>
            <p className="modal-description">{returningBooking.vehicleName} · {returningBooking.departureLog.destination}</p>
            <div className="distance-summary"><span>เลขไมล์เริ่มต้น<strong>{returningBooking.departureLog.startingOdometer.toLocaleString("th-TH")} กม.</strong></span><ArrowRight size={16} /><span>ระยะทางที่ใช้<strong>{Math.max(Number(endingOdometer || 0) - returningBooking.departureLog.startingOdometer, 0).toLocaleString("th-TH")} กม.</strong></span></div>
            <form className="booking-form" onSubmit={submitReturn}>
              <label className="field-label">วันและเวลากลับ <span>*</span><input type="datetime-local" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} required /></label>
              <label className="field-label">เลขไมล์สิ้นสุด <span>*</span><div className="input-icon-wrap"><Gauge size={16} /><input type="number" min={returningBooking.departureLog.startingOdometer} step="0.1" value={endingOdometer} onChange={(event) => setEndingOdometer(event.target.value)} required /><em>กม.</em></div></label>
              <div className="form-footer modal-footer"><button type="button" className="secondary-button" onClick={() => setReturningBooking(null)}>ยกเลิก</button><button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "ยืนยันการกลับ"} <Check size={16} /></button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, tone, label, value, suffix, detail }: {
  icon: ReactNode;
  tone: string;
  label: string;
  value: string;
  suffix: string;
  detail: string;
}) {
  return <article className="stat-card">
    <div className={`stat-icon tone-${tone}`}>{icon}<span className="stat-arrow"><ArrowUpRight size={13} /></span></div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}<small>{suffix}</small></div>
    <div className="stat-detail">{detail}</div>
  </article>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><span><CalendarDays size={20} /></span><p>{text}</p></div>;
}
