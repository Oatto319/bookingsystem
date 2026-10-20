import type { VehicleBooking } from "@/types/booking";

export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function timeLabel(value: Date | string) {
  return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(value),
  );
}

/** ค่าเวลาสำหรับ <input type="datetime-local"> ตามเวลาท้องถิ่น */
export function toLocalInput(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export const OVERDUE_FALLBACK_HOURS = 10;

/** เวลาที่ต้องคืนรถ: ใช้ค่าที่ผู้ใช้ระบุ ถ้าไม่ระบุใช้เวลาออก + 10 ชม. */
export function expectedReturn(booking: VehicleBooking) {
  const { expectedReturnAt, departedAt } = booking.departureLog;
  return expectedReturnAt
    ? new Date(expectedReturnAt)
    : new Date(new Date(departedAt).getTime() + OVERDUE_FALLBACK_HOURS * 3_600_000);
}

export function isOverdue(booking: VehicleBooking, now: Date | null) {
  return booking.status === "in_use" && now !== null && now > expectedReturn(booking);
}

export const number = (value: number | null | undefined) => (value ?? 0).toLocaleString("th-TH");
