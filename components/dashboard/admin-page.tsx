"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createCatalogItem,
  createUser,
  fetchAdminCatalog,
  fetchUsers,
  updateCatalogItem,
  updateUser,
} from "@/lib/booking-api";
import type { ManagedUser, Room, Vehicle } from "@/types/booking";
import { EmptyState, PanelHeading } from "./shared";

type Tab = "rooms" | "vehicles" | "users";

export function AdminPage({
  currentUserId,
  onChanged,
  onUnauthorized,
  onNotice,
}: {
  currentUserId: string;
  onChanged: () => void;
  onUnauthorized: () => void;
  onNotice: (type: "success" | "error", text: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("rooms");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError && error.status === 401) onUnauthorized();
      else onNotice("error", error instanceof Error ? error.message : fallback);
    },
    [onUnauthorized, onNotice],
  );

  const load = useCallback(async () => {
    try {
      const [catalog, userList] = await Promise.all([fetchAdminCatalog(), fetchUsers()]);
      setRooms(catalog.rooms);
      setVehicles(catalog.vehicles);
      setUsers(userList);
    } catch (error) {
      handleError(error, "โหลดข้อมูลจัดการระบบไม่สำเร็จ");
    }
  }, [handleError]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function act(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      onNotice("success", success);
      await load();
      onChanged();
      return true;
    } catch (error) {
      handleError(error, "บันทึกไม่สำเร็จ");
      return false;
    }
  }

  return (
    <section className="panel logbook-panel">
      <PanelHeading title="จัดการระบบ" description="เพิ่ม/แก้ไข/ปิดใช้งานห้องประชุม รถสำนักงาน และผู้ใช้ โดยไม่ต้องแก้โค้ด" />
      <div className="segmented admin-tabs" role="tablist" aria-label="หมวดการจัดการ">
        {([["rooms", "ห้องประชุม"], ["vehicles", "รถสำนักงาน"], ["users", "ผู้ใช้งาน"]] as const).map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {tab === "rooms" && <RoomsAdmin rooms={rooms} act={act} />}
      {tab === "vehicles" && <VehiclesAdmin vehicles={vehicles} act={act} />}
      {tab === "users" && <UsersAdmin users={users} currentUserId={currentUserId} act={act} />}
    </section>
  );
}

type Act = (action: () => Promise<unknown>, success: string) => Promise<boolean>;

function RoomsAdmin({ rooms, act }: { rooms: Room[]; act: Act }) {
  const blank = { code: "", name: "", capacity: "", location: "", amenities: "", color: "sage" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const set = (key: keyof typeof blank, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { ...form, capacity: Number(form.capacity), amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean) };
    const ok = await act(
      () => (editing ? updateCatalogItem("rooms", editing, payload) : createCatalogItem("rooms", payload)),
      editing ? "แก้ไขห้องประชุมแล้ว" : "เพิ่มห้องประชุมแล้ว",
    );
    if (ok) { setForm(blank); setEditing(null); }
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ห้อง</th><th>รหัส</th><th>ที่นั่ง</th><th>ที่ตั้ง</th><th>สถานะ</th><th /></tr></thead>
          <tbody>{rooms.map((r) => (
            <tr key={r.code} className={r.active === false ? "row-inactive" : ""}>
              <td><strong>{r.name}</strong></td><td>{r.code}</td><td>{r.capacity}</td><td>{r.location}</td>
              <td>{r.active === false ? "ปิดใช้งาน" : "ใช้งาน"}</td>
              <td className="row-actions">
                <button className="text-button" onClick={() => { setEditing(r.code); setForm({ code: r.code, name: r.name, capacity: String(r.capacity), location: r.location, amenities: r.amenities.join(", "), color: r.color }); }}>แก้ไข</button>
                <button className="text-button" onClick={() => act(() => updateCatalogItem("rooms", r.code, { active: r.active === false }), r.active === false ? "เปิดใช้งานห้องแล้ว" : "ปิดใช้งานห้องแล้ว")}>{r.active === false ? "เปิดใช้งาน" : "ปิดใช้งาน"}</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {rooms.length === 0 && <EmptyState text="ยังไม่มีห้องประชุม" />}
      </div>
      <form className="booking-form admin-form" onSubmit={submit}>
        <h3>{editing ? `แก้ไขห้อง (${editing})` : "เพิ่มห้องประชุมใหม่"}</h3>
        <div className="form-row">
          <label className="field-label">รหัสห้อง <small>(เว้นว่างเพื่อสร้างอัตโนมัติ)</small><input disabled={!!editing} pattern="[a-z0-9\-]{3,40}" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="ไม่ต้องกรอกก็ได้" /></label>
          <label className="field-label">ชื่อห้อง <span>*</span><input required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field-label">จำนวนที่นั่ง <span>*</span><input required type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></label>
          <label className="field-label">ที่ตั้ง <span>*</span><input required value={form.location} onChange={(e) => set("location", e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field-label">สิ่งอำนวยความสะดวก <small>(คั่นด้วยจุลภาค)</small><input value={form.amenities} onChange={(e) => set("amenities", e.target.value)} placeholder="จอแสดงผล, ไวท์บอร์ด" /></label>
          <label className="field-label">สีในปฏิทิน<select value={form.color} onChange={(e) => set("color", e.target.value)}><option value="sage">เขียว</option><option value="blue">น้ำเงิน</option><option value="amber">เหลือง</option></select></label>
        </div>
        <div className="form-footer"><span />
          <div className="footer-actions">
            {editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setForm(blank); }}>ยกเลิก</button>}
            <button className="primary-button"><Plus size={16} /> {editing ? "บันทึก" : "เพิ่มห้อง"}</button>
          </div>
        </div>
      </form>
    </>
  );
}

function VehiclesAdmin({ vehicles, act }: { vehicles: Vehicle[]; act: Act }) {
  const blank = { code: "", name: "", registration: "", seats: "", type: "sedan" };
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const set = (key: keyof typeof blank, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const payload = { ...form, seats: Number(form.seats) };
    const ok = await act(
      () => (editing ? updateCatalogItem("vehicles", editing, payload) : createCatalogItem("vehicles", payload)),
      editing ? "แก้ไขข้อมูลรถแล้ว" : "เพิ่มรถแล้ว",
    );
    if (ok) { setForm(blank); setEditing(null); }
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>รถ</th><th>รหัส</th><th>ทะเบียน</th><th>ที่นั่ง</th><th>ประเภท</th><th>สถานะ</th><th /></tr></thead>
          <tbody>{vehicles.map((v) => (
            <tr key={v.code} className={v.active === false ? "row-inactive" : ""}>
              <td><strong>{v.name}</strong></td><td>{v.code}</td><td>{v.registration}</td><td>{v.seats}</td><td>{v.type}</td>
              <td>{v.active === false ? "ปิดใช้งาน (ซ่อม/ไม่ใช้)" : "ใช้งาน"}</td>
              <td className="row-actions">
                <button className="text-button" onClick={() => { setEditing(v.code); setForm({ code: v.code, name: v.name, registration: v.registration, seats: String(v.seats), type: v.type }); }}>แก้ไข</button>
                <button className="text-button" onClick={() => act(() => updateCatalogItem("vehicles", v.code, { active: v.active === false }), v.active === false ? "เปิดใช้งานรถแล้ว" : "ปิดใช้งานรถแล้ว")}>{v.active === false ? "เปิดใช้งาน" : "ปิดใช้งาน"}</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {vehicles.length === 0 && <EmptyState text="ยังไม่มีรถสำนักงาน" />}
      </div>
      <form className="booking-form admin-form" onSubmit={submit}>
        <h3>{editing ? `แก้ไขรถ (${editing})` : "เพิ่มรถสำนักงานใหม่"}</h3>
        <div className="form-row">
          <label className="field-label">รหัสรถ <small>(เว้นว่างเพื่อสร้างอัตโนมัติ)</small><input disabled={!!editing} pattern="[a-z0-9\-]{3,40}" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="ไม่ต้องกรอกก็ได้" /></label>
          <label className="field-label">ชื่อรถ <span>*</span><input required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field-label">ทะเบียน <span>*</span><input required value={form.registration} onChange={(e) => set("registration", e.target.value)} /></label>
          <label className="field-label">จำนวนที่นั่ง <span>*</span><input required type="number" min="1" value={form.seats} onChange={(e) => set("seats", e.target.value)} /></label>
        </div>
        <label className="field-label">ประเภท<select value={form.type} onChange={(e) => set("type", e.target.value)}><option value="sedan">รถยนต์นั่ง</option><option value="pickup">รถกระบะ</option><option value="van">รถตู้</option></select></label>
        <div className="form-footer"><span />
          <div className="footer-actions">
            {editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setForm(blank); }}>ยกเลิก</button>}
            <button className="primary-button"><Plus size={16} /> {editing ? "บันทึก" : "เพิ่มรถ"}</button>
          </div>
        </div>
      </form>
    </>
  );
}

function UsersAdmin({ users, currentUserId, act }: { users: ManagedUser[]; currentUserId: string; act: Act }) {
  const blank = { username: "", displayName: "", department: "", role: "user", password: "" };
  const [form, setForm] = useState(blank);
  const set = (key: keyof typeof blank, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await act(() => createUser(form), "เพิ่มผู้ใช้แล้ว")) setForm(blank);
  }

  function resetPassword(user: ManagedUser) {
    const password = window.prompt(`ตั้งรหัสผ่านใหม่ให้ ${user.displayName} (อย่างน้อย 8 ตัวอักษร)`);
    if (password) void act(() => updateUser(user.id, { password }), "ตั้งรหัสผ่านใหม่แล้ว (ผู้ใช้ต้องเข้าสู่ระบบใหม่)");
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ชื่อ</th><th>ชื่อผู้ใช้</th><th>หน่วยงาน</th><th>สิทธิ์</th><th>สถานะ</th><th /></tr></thead>
          <tbody>{users.map((u) => {
            const self = u.id === currentUserId;
            return (
              <tr key={u.id} className={u.active ? "" : "row-inactive"}>
                <td><strong>{u.displayName}</strong>{self ? " (คุณ)" : ""}</td><td>{u.username}</td><td>{u.department || "-"}</td>
                <td>{u.role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}</td><td>{u.active ? "ใช้งาน" : "ปิดใช้งาน"}</td>
                <td className="row-actions">
                  <button className="text-button" onClick={() => resetPassword(u)}>ตั้งรหัสผ่านใหม่</button>
                  {!self && <button className="text-button" onClick={() => act(() => updateUser(u.id, { role: u.role === "admin" ? "user" : "admin" }), "เปลี่ยนสิทธิ์แล้ว")}>{u.role === "admin" ? "ลดเป็นผู้ใช้" : "ตั้งเป็นแอดมิน"}</button>}
                  {!self && <button className="text-button" onClick={() => act(() => updateUser(u.id, { active: !u.active }), u.active ? "ปิดใช้งานผู้ใช้แล้ว" : "เปิดใช้งานผู้ใช้แล้ว")}>{u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <form className="booking-form admin-form" onSubmit={submit}>
        <h3>เพิ่มผู้ใช้ใหม่</h3>
        <div className="form-row">
          <label className="field-label">ชื่อผู้ใช้ <span>*</span><input required pattern="[a-zA-Z0-9._\-]{3,50}" autoComplete="off" value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="a-z 0-9 . _ -" /></label>
          <label className="field-label">ชื่อ - นามสกุล <span>*</span><input required maxLength={100} value={form.displayName} onChange={(e) => set("displayName", e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label className="field-label">หน่วยงาน<input maxLength={100} value={form.department} onChange={(e) => set("department", e.target.value)} /></label>
          <label className="field-label">สิทธิ์<select value={form.role} onChange={(e) => set("role", e.target.value)}><option value="user">ผู้ใช้งาน</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
        </div>
        <label className="field-label">รหัสผ่านเริ่มต้น <span>*</span> <small>(อย่างน้อย 8 ตัวอักษร)</small><input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} /></label>
        <div className="form-footer"><span /><button className="primary-button"><Plus size={16} /> เพิ่มผู้ใช้</button></div>
      </form>
    </>
  );
}