"use client";

import { KeyRound, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { changePassword } from "@/lib/booking-api";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export function ChangePasswordModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, onClose);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== confirm) return setError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน");
    setBusy(true);
    setError("");
    try {
      await changePassword(current, next);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="return-modal" role="dialog" aria-modal="true" aria-labelledby="pw-title" ref={ref} tabIndex={-1}>
        <div className="modal-heading">
          <div className="modal-icon"><KeyRound size={20} /></div>
          <button className="icon-button" aria-label="ปิด" onClick={onClose}><X size={18} /></button>
        </div>
        <h2 id="pw-title">เปลี่ยนรหัสผ่าน</h2>
        {error && <div className="notice notice-error" role="alert"><span>{error}</span></div>}
        <form className="booking-form" onSubmit={submit}>
          <label className="field-label">รหัสผ่านปัจจุบัน<input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          <label className="field-label">รหัสผ่านใหม่ <small>(อย่างน้อย 8 ตัวอักษร)</small><input type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} /></label>
          <label className="field-label">ยืนยันรหัสผ่านใหม่<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          <div className="form-footer modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>ยกเลิก</button>
            <button className="primary-button" disabled={busy}>{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
