"use client";

import {
  CalendarDays,
  CarFront,
  Check,
  CircleHelp,
  DoorOpen,
  KeyRound,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DashboardView, Notice, SessionUser } from "@/types/booking";

const navItems: { key: DashboardView; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { key: "overview", label: "ภาพรวม", icon: Settings2 },
  { key: "meeting", label: "จองห้องประชุม", icon: DoorOpen },
  { key: "vehicle", label: "บันทึกการใช้รถ", icon: CarFront },
  { key: "logbook", label: "สมุดบันทึกการเดินทาง", icon: MapPin },
  { key: "admin", label: "จัดการระบบ", icon: ShieldCheck, adminOnly: true },
];

function Navigation({
  view,
  setView,
  inUseCount,
  isAdmin,
  mobile = false,
  onNavigate,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
  isAdmin: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label="เมนูหลัก">
      {navItems.filter((item) => !item.adminOnly || isAdmin).map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={`${mobile ? "" : "nav-item"} ${view === key ? "active" : ""}`}
          aria-current={view === key ? "page" : undefined}
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
  user,
  onLogout,
  onChangePassword,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
  user: SessionUser;
  onLogout: () => void;
  onChangePassword: () => void;
}) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView("overview")}>
        <span className="brand-mark"><Leaf size={21} strokeWidth={2.1} /></span>
        <span className="brand-copy"><strong>เกษตรพร้อม</strong><small>สำนักงานเกษตรจังหวัด</small></span>
      </button>
      <div className="side-label">เมนูหลัก</div>
      <Navigation view={view} setView={setView} inUseCount={inUseCount} isAdmin={user.role === "admin"} />
      <div className="sidebar-bottom">
        <div className="profile">
          <div className="avatar" aria-hidden="true">{user.displayName.slice(0, 2)}</div>
          <div className="profile-copy"><strong>{user.displayName}</strong><small>{user.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}</small></div>
          <button className="icon-button" aria-label="เปลี่ยนรหัสผ่าน" title="เปลี่ยนรหัสผ่าน" onClick={onChangePassword}><KeyRound size={15} /></button>
          <button className="icon-button" aria-label="ออกจากระบบ" title="ออกจากระบบ" onClick={onLogout}><LogOut size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

function NoticeBanner({ notice, offline, onDismiss }: { notice: Notice | null; offline: boolean; onDismiss: () => void }) {
  return (
    <>
      {offline && (
        <div className="notice notice-warning" role="status">
          <CircleHelp size={17} />
          <span>เชื่อมต่อฐานข้อมูลไม่ได้ — กำลังแสดงข้อมูลตัวอย่างและปิดการบันทึกไว้ชั่วคราว ระบบจะลองเชื่อมต่อใหม่อัตโนมัติ</span>
        </div>
      )}
      {notice && (
        <div className={`notice ${notice.type === "success" ? "notice-success" : "notice-error"}`} role={notice.type === "error" ? "alert" : "status"}>
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
  user,
  onDismissNotice,
  onLogout,
  onChangePassword,
  children,
}: {
  view: DashboardView;
  setView: (view: DashboardView) => void;
  inUseCount: number;
  currentDate: Date | null;
  offline: boolean;
  notice: Notice | null;
  user: SessionUser;
  onDismissNotice: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
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
      <Sidebar view={view} setView={setView} inUseCount={inUseCount} user={user} onLogout={onLogout} onChangePassword={onChangePassword} />
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>ระบบจัดการสำนักงาน</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <div className="date-pill"><CalendarDays size={16} />{currentDate?.toLocaleDateString("th-TH") ?? "กำลังโหลดวันที่..."}</div>
            <button className="mobile-menu" aria-label="เปิดเมนู" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}><Menu size={20} /></button>
          </div>
        </header>
        {mobileNavOpen && (
          <>
            <Navigation view={view} setView={setView} inUseCount={inUseCount} isAdmin={user.role === "admin"} mobile onNavigate={() => setMobileNavOpen(false)} />
            <div className="mobile-account">
              <span>{user.displayName}</span>
              <button className="text-button" onClick={onChangePassword}>เปลี่ยนรหัสผ่าน</button>
              <button className="text-button" onClick={onLogout}>ออกจากระบบ</button>
            </div>
          </>
        )}
        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> ระบบจองทรัพยากรสำนักงาน</div>
              <h1>{view === "overview" ? `${greeting} ${user.displayName.split(" ")[0]} 🌿` : pageTitle}</h1>
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
