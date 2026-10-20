// เขตเวลาประเทศไทย (UTC+7) สำหรับขอบเขตวันที่/เดือนของรายงาน
const TZ = "+07:00";

export function thaiDayStart(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T00:00:00${TZ}`) : null;
}

export function thaiMonthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00${TZ}`);
  const [year, mon] = month.split("-").map(Number);
  const next = mon === 12 ? `${year + 1}-01` : `${year}-${String(mon + 1).padStart(2, "0")}`;
  return { start, end: new Date(`${next}-01T00:00:00${TZ}`) };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildLogbookFilter(params: URLSearchParams) {
  const filter: Record<string, unknown> = {};
  const status = params.get("status");
  if (status === "in_use" || status === "returned") filter.status = status;
  const vehicleCode = params.get("vehicleCode");
  if (vehicleCode) filter.vehicleCode = vehicleCode;

  const from = thaiDayStart(params.get("from") ?? "");
  const to = thaiDayStart(params.get("to") ?? "");
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lt = new Date(to.getTime() + 86_400_000); // รวมทั้งวันสุดท้าย
    filter["departureLog.departedAt"] = range;
  }

  const q = (params.get("q") ?? "").trim().slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { vehicleName: rx },
      { registration: rx },
      { "departureLog.destination": rx },
      { "departureLog.requester": rx },
      { "departureLog.driver": rx },
      { "departureLog.purpose": rx },
    ];
  }
  return filter;
}
