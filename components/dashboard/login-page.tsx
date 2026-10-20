"use client";

import { Leaf, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginPage({
  unavailable,
  onLogin,
}: {
  unavailable: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เข้าสู่ระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card panel">
        <span className="brand-mark"><Leaf size={21} strokeWidth={2.1} /></span>
        <h1>เกษตรพร้อม</h1>
        <p className="page-subtitle">ระบบจองทรัพยากรสำนักงาน · เข้าสู่ระบบเพื่อใช้งาน</p>
        {unavailable && (
          <div className="notice notice-warning">
            <span>ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ตรวจสอบ <code>MONGODB_URI</code> แล้วลองใหม่</span>
          </div>
        )}
        {error && <div className="notice notice-error" role="alert"><span>{error}</span></div>}
        <form className="booking-form" onSubmit={submit}>
          <label className="field-label">ชื่อผู้ใช้
            <input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </label>
          <label className="field-label">รหัสผ่าน
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="primary-button" disabled={busy}><LogIn size={16} /> {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>
        <p className="login-help">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบเพื่อตั้งรหัสผ่านใหม่</p>
      </section>
    </main>
  );
}
