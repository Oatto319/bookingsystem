import type { MeetingBooking, Room, Vehicle, VehicleBooking } from "@/types/booking";

type CatalogResponse = { rooms: Room[]; vehicles: Vehicle[] };
type BookingResponse<T> = { bookings: T[] };

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data;
}

export async function fetchBookingData() {
  const [catalogResponse, meetingResponse, vehicleResponse] = await Promise.all([
    fetch("/api/catalog"),
    fetch("/api/meeting-bookings"),
    fetch("/api/vehicle-bookings"),
  ]);
  const [catalog, meetings, vehicles] = await Promise.all([
    readResponse<CatalogResponse>(catalogResponse),
    readResponse<BookingResponse<MeetingBooking>>(meetingResponse),
    readResponse<BookingResponse<VehicleBooking>>(vehicleResponse),
  ]);
  return { catalog, meetings, vehicles };
}

export async function createMeetingBooking(data: Record<string, unknown>) {
  return readResponse(
    await fetch("/api/meeting-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function createVehicleBooking(data: Record<string, unknown>) {
  return readResponse(
    await fetch("/api/vehicle-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function returnVehicleBooking(id: string, data: Record<string, unknown>) {
  return readResponse(
    await fetch(`/api/vehicle-bookings/${id}/return`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}
