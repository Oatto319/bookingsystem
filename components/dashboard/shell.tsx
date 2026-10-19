"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  DoorOpen,
  Leaf,
  MapPin,
  Menu,
  Plus,
  Settings2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DashboardView, Notice } from "@/types/booking";

const navItems: { key: DashboardView; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "ภาพรวม", icon: Settings2 },
  { key: "meeting", label: "จองห้องประชุม", icon: DoorOpen },
  { key: "vehicle", label: "จองรถสำนักงาน", icon: CarFront },
  { key: "logbook", label: "สมุดบันทึกการเดินทาง", icon: MapPin },
];

function Navigation({
  view,
  setView,
  inUseCount,
  mobile = false,
  onNavigate,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label="เมนูหลัก">
      {navItems.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`${mobile ? "" : "nav-item"} ${view === key ? "active" : ""}`}
          onClick={() => {
            setView(key);
            onNavigate?.();
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
          <span>{label}</span>
          {key === "vehicle" && inUseCount > 0 && <span className="nav-count">{inUseCount}</span>}
        </button>
      ))}
    </nav>
  );
}

function Sidebar({
  view,
  setView,
  inUseCount,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
}) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView("overview")}>
        <span className="brand-mark"><Leaf size={21} strokeWidth={2.1} /></span>
        <span className="brand-copy"><strong>เกษตรพร้อม</strong><small>สำนักงานเกษตรจังหวัด</small></span>
      </button>
      <div className="side-label">เมนูหลัก</div>
      <Navigation view={view} setView={setView} inUseCount={inUseCount} />
      <div className="sidebar-bottom">
        <div className="help-card">
          <span className="help-icon"><CircleHelp size={17} /></span>
          <div><strong>ต้องการความช่วยเหลือ?</strong><p>ติดต่อฝ่ายบริหารทั่วไป</p></div>
          <ArrowRight size={15} />
        </div>
        <div className="profile">
          <div className="avatar">สก</div>
          <div className="profile-copy"><strong>สำนักงานเกษตร</strong><small>ผู้ดูแลระบบ</small></div>
          <ChevronDown size={15} />
        </div>
      </div>
    </aside>
  );
}

function NoticeBanner({
  notice,
  offline,
  onDismiss,
}: {
  notice: Notice | null;
  offline: boolean;
  onDismiss: () => void;
}) {
  return (
    <>
      {offline && (
        <div className="notice notice-warning">
          <CircleHelp size={17} />
          <span>กำลังแสดงข้อมูลตัวอย่าง — ตั้งค่า <code>MONGODB_URI</code> และเชื่อมต่อ MongoDB เพื่อบันทึกข้อมูลจริง</span>
          <button aria-label="ปิดข้อความ" onClick={onDismiss}><X size={16} /></button>
        </div>
      )}
      {notice && (
        <div className={`notice ${notice.type === "success" ? "notice-success" : "notice-error"}`}>
          {notice.type === "success" ? <Check size={17} /> : <CircleHelp size={17} />}
          <span>{notice.text}</span>
          <button aria-label="ปิดข้อความ" onClick={onDismiss}><X size={16} /></button>
        </div>
      )}
    </>
  );
}

export function DashboardShell({
  view,
  setView,
  inUseCount,
  currentDate,
  offline,
  notice,
  onDismissNotice,
  children,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
  currentDate: Date | null;
  offline: boolean;
  notice: Notice | null;
  onDismissNotice: () => void;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pageTitle = navItems.find((item) => item.key === view)?.label;
  const hour = currentDate?.getHours();
  const greeting =
    hour === undefined ? "สวัสดี" : hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const buddhistYear = currentDate ? currentDate.getFullYear() + 543 : "";

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} inUseCount={inUseCount} />
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>ระบบจัดการสำนักงาน</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <div className="date-pill"><CalendarDays size={16} />{currentDate?.toLocaleDateString("th-TH") ?? "กำลังโหลดวันที่..."}</div>
            <button className="icon-button" aria-label="การแจ้งเตือน"><Bell size={18} /><i /></button>
            <button className="mobile-menu" aria-label="เปิดเมนู" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          </div>
        </header>
        {mobileNavOpen && (
          <Navigation
            view={view}
            setView={setView}
            inUseCount={inUseCount}
            mobile
            onNavigate={() => setMobileNavOpen(false)}
          />
        )}
        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> ระบบจองทรัพยากรสำนักงาน</div>
              <h1>{view === "overview" ? `${greeting} 🌿` : pageTitle}</h1>
              <p className="page-subtitle">
                {view === "overview" ? "พร้อมเริ่มต้นวันทำงานที่ราบรื่นของคุณแล้วหรือยัง?" : "จัดการการใช้งานทรัพยากรสำนักงานได้ในที่เดียว"}
              </p>
            </div>
            <button className="primary-button" onClick={() => setView("meeting")}><Plus size={17} /> สร้างรายการจอง</button>
          </div>
          <NoticeBanner notice={notice} offline={offline} onDismiss={onDismissNotice} />
          {children}
          <footer className="page-footer"><span>© {buddhistYear} สำนักงานเกษตรจังหวัด</span><span>ระบบบริหารจัดการทรัพยากรภายในสำนักงาน</span></footer>
        </section>
      </main>
    </div>
  );
}
