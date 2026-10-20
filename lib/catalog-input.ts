type Parsed = { ok: true; value: Record<string, unknown> } | { ok: false; message: string };

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export function parseCatalogItem(
  kind: "rooms" | "vehicles",
  data: Record<string, unknown> | null,
  options: { requireCode: boolean },
): Parsed {
  if (!data) return { ok: false, message: "ข้อมูลไม่ถูกต้อง" };
  const code = str(data.code);
  const name = str(data.name);
  if (options.requireCode && !/^[a-z0-9-]{3,40}$/.test(code)) {
    return { ok: false, message: "รหัสต้องเป็น a-z 0-9 และ - ความยาว 3-40 ตัวอักษร" };
  }
  if (!name || name.length > 100) return { ok: false, message: "กรุณาระบุชื่อ (ไม่เกิน 100 ตัวอักษร)" };

  if (kind === "rooms") {
    const capacity = Number(data.capacity);
    const location = str(data.location);
    const amenities = Array.isArray(data.amenities)
      ? data.amenities.filter((a): a is string => typeof a === "string").map((a) => a.trim()).filter(Boolean).slice(0, 12)
      : [];
    const color = ["sage", "blue", "amber"].includes(str(data.color)) ? str(data.color) : "sage";
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000 || !location) {
      return { ok: false, message: "กรุณาระบุจำนวนที่นั่งและที่ตั้งให้ถูกต้อง" };
    }
    return { ok: true, value: { ...(options.requireCode ? { code } : {}), name, capacity, location, amenities, color } };
  }

  const registration = str(data.registration);
  const seats = Number(data.seats);
  const type = str(data.type);
  if (!registration || !Number.isInteger(seats) || seats < 1 || seats > 100 || !["pickup", "van", "sedan"].includes(type)) {
    return { ok: false, message: "กรุณาระบุทะเบียน จำนวนที่นั่ง และประเภทรถให้ถูกต้อง" };
  }
  return { ok: true, value: { ...(options.requireCode ? { code } : {}), name, registration, seats, type } };
}
