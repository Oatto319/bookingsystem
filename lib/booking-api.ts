import type {
  LogbookQuery,
  LogbookResult,
  ManagedUser,
  MeetingBooking,
  MonthlySummaryRow,
  Room,
  SessionUser,
  Vehicle,
  VehicleBooking,
} from "@/types/booking";

type CatalogResponse = { rooms: Room[]; vehicles: Vehicle[] };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new ApiError(data.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่", response.status);
  return data;
}

function send<T = unknown>(url: string, method: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((response) => readResponse<T>(response));
}

// ---------- auth ----------
export const fetchCurrentUser = () =>
  fetch("/api/auth/me", { cache: "no-store" })
    .then((response) => readResponse<{ user: SessionUser }>(response))
    .then((data) => data.user);
export const login = (username: string, password: string) =>
  send<{ user: SessionUser }>("/api/auth/login", "POST", { username, password }).then((data) => data.user);
export const logout = () => send("/api/auth/logout", "POST");
export const changePassword = (currentPassword: string, newPassword: string) =>
  send("/api/auth/password", "POST", { currentPassword, newPassword });

// ---------- booking data ----------
export async function fetchBookingData() {
  const [catalogResponse, meetingResponse, vehicleResponse] = await Promise.all([
    fetch("/api/catalog", { cache: "no-store" }),
    fetch("/api/meeting-bookings", { cache: "no-store" }),
    fetch("/api/vehicle-bookings", { cache: "no-store" }),
  ]);
  const [catalog, meetings, vehicles] = await Promise.all([
    readResponse<CatalogResponse>(catalogResponse),
    readResponse<{ bookings: MeetingBooking[] }>(meetingResponse),
    readResponse<{ bookings: VehicleBooking[]; total: number }>(vehicleResponse),
  ]);
  return { catalog, meetings, vehicles };
}

export const createMeetingBooking = (data: Record<string, unknown>) => send("/api/meeting-bookings", "POST", data);
export const updateMeetingBooking = (id: string, data: Record<string, unknown>) =>
  send(`/api/meeting-bookings/${id}`, "PATCH", data);
export const cancelMeetingBooking = (id: string) =>
  send(`/api/meeting-bookings/${id}`, "PATCH", { action: "cancel" });

export const createVehicleBooking = (data: Record<string, unknown>) => send("/api/vehicle-bookings", "POST", data);
export const returnVehicleBooking = (id: string, data: Record<string, unknown>) =>
  send(`/api/vehicle-bookings/${id}/return`, "PATCH", data);

// ---------- logbook ----------
export function logbookParams(query: Omit<LogbookQuery, "page">) {
  const params = new URLSearchParams();
  if (query.status !== "all") params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.q.trim()) params.set("q", query.q.trim());
  if (query.vehicleCode) params.set("vehicleCode", query.vehicleCode);
  return params;
}

export function fetchLogbook(query: LogbookQuery) {
  const params = logbookParams(query);
  params.set("page", String(query.page));
  params.set("limit", "20");
  return fetch(`/api/vehicle-bookings/logbook?${params}`, { cache: "no-store" }).then((response) =>
    readResponse<LogbookResult>(response),
  );
}

export const fetchMonthlySummary = (month: string) =>
  fetch(`/api/vehicle-bookings/summary?month=${month}`, { cache: "no-store" })
    .then((response) => readResponse<{ summary: MonthlySummaryRow[] }>(response))
    .then((data) => data.summary);

// ---------- admin ----------
export const fetchAdminCatalog = () =>
  fetch("/api/catalog?all=1", { cache: "no-store" }).then((response) => readResponse<CatalogResponse>(response));
export const createCatalogItem = (kind: "rooms" | "vehicles", data: Record<string, unknown>) =>
  send(`/api/admin/catalog/${kind}`, "POST", data);
export const updateCatalogItem = (kind: "rooms" | "vehicles", code: string, data: Record<string, unknown>) =>
  send(`/api/admin/catalog/${kind}/${code}`, "PATCH", data);
export const fetchUsers = () =>
  fetch("/api/admin/users", { cache: "no-store" })
    .then((response) => readResponse<{ users: ManagedUser[] }>(response))
    .then((data) => data.users);
export const createUser = (data: Record<string, unknown>) => send("/api/admin/users", "POST", data);
export const updateUser = (id: string, data: Record<string, unknown>) => send(`/api/admin/users/${id}`, "PATCH", data);
