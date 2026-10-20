"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  cancelMeetingBooking,
  createMeetingBooking,
  createVehicleBooking,
  fetchBookingData,
  returnVehicleBooking,
  updateMeetingBooking,
} from "@/lib/booking-api";
import { sampleRooms, sampleVehicles } from "@/lib/booking-data";
import type { MeetingBooking, Notice, Room, Vehicle, VehicleBooking } from "@/types/booking";

const REFRESH_INTERVAL_MS = 60_000;

export type MeetingFormValues = {
  roomCode: string;
  topic: string;
  startAt: string; // datetime-local
  endAt: string;
  attendees: number;
  department: string;
  phone: string;
};

export type DepartureFormValues = {
  vehicleCode: string;
  departedAt: string;
  expectedReturnAt: string;
  destination: string;
  purpose: string;
  driver: string;
  passengers: number;
  startingOdometer: number;
  note: string;
};

export type ReturnFormValues = {
  returnedAt: string;
  endingOdometer: number;
  fuelLiters: string;
  fuelCost: string;
};

const iso = (local: string) => new Date(local).toISOString();

export function useBookings({ enabled, onUnauthorized }: { enabled: boolean; onUnauthorized: () => void }) {
  const [rooms, setRooms] = useState<Room[]>(sampleRooms);
  const [vehicles, setVehicles] = useState<Vehicle[]>(sampleVehicles);
  const [meetingBookings, setMeetingBookings] = useState<MeetingBooking[]>([]);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
  const [vehicleTotal, setVehicleTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  /** เพิ่มค่าทุกครั้งที่โหลดข้อมูลสำเร็จ ให้หน้าที่ดึงข้อมูลเองรีเฟรชตาม */
  const [version, setVersion] = useState(0);

  const unauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    unauthorizedRef.current = onUnauthorized;
  });

  const refresh = useCallback(async () => {
    try {
      const { catalog, meetings, vehicles: vehicleData } = await fetchBookingData();
      setRooms(catalog.rooms);
      setVehicles(catalog.vehicles);
      setMeetingBookings(meetings.bookings);
      setVehicleBookings(vehicleData.bookings);
      setVehicleTotal(vehicleData.total);
      setOffline(false);
      setVersion((current) => current + 1);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) unauthorizedRef.current();
      else setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // โหลดครั้งแรก + นาฬิกา/รีเฟรชทุก 1 นาที + รีเฟรชเมื่อกลับมาที่แท็บ
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setCurrentDate(new Date());
    const clock = setTimeout(tick, 0);
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => {
      tick();
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      tick();
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(clock);
      clearTimeout(initial);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [enabled, refresh]);

  const run = useCallback(
    async (submit: () => Promise<unknown>, successMessage: string, failureMessage: string) => {
      setBusy(true);
      setNotice(null);
      try {
        await submit();
        setNotice({ type: "success", text: successMessage });
        await refresh();
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          unauthorizedRef.current();
        } else {
          setNotice({ type: "error", text: error instanceof Error ? error.message : failureMessage });
        }
        // ถ้าชนกับคนอื่น ให้โหลดข้อมูลล่าสุดมาแสดงทันที
        if (error instanceof ApiError && error.status === 409) await refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const submitMeeting = (values: MeetingFormValues, editingId: string | null) => {
    const payload = {
      roomCode: values.roomCode,
      topic: values.topic,
      startAt: iso(values.startAt),
      endAt: iso(values.endAt),
      attendees: values.attendees,
      department: values.department,
      phone: values.phone,
    };
    return run(
      () => (editingId ? updateMeetingBooking(editingId, payload) : createMeetingBooking(payload)),
      editingId ? "แก้ไขการจองห้องประชุมเรียบร้อยแล้ว" : "บันทึกการจองห้องประชุมเรียบร้อยแล้ว",
      "บันทึกการจองไม่สำเร็จ",
    );
  };

  const cancelMeeting = (id: string) =>
    run(() => cancelMeetingBooking(id), "ยกเลิกการจองห้องประชุมแล้ว", "ยกเลิกการจองไม่สำเร็จ");

  const submitDeparture = (values: DepartureFormValues) =>
    run(
      () =>
        createVehicleBooking({
          ...values,
          departedAt: iso(values.departedAt),
          expectedReturnAt: values.expectedReturnAt ? iso(values.expectedReturnAt) : "",
        }),
      "บันทึกข้อมูลออกเดินทางแล้ว ขอให้เดินทางปลอดภัย",
      "บันทึกข้อมูลออกเดินทางไม่สำเร็จ",
    );

  const submitReturn = (booking: VehicleBooking, values: ReturnFormValues) =>
    run(
      () =>
        returnVehicleBooking(booking._id, {
          returnedAt: iso(values.returnedAt),
          endingOdometer: values.endingOdometer,
          fuelLiters: values.fuelLiters,
          fuelCost: values.fuelCost,
        }),
      "บันทึกการกลับถึงสำนักงานและคำนวณระยะทางแล้ว",
      "บันทึกข้อมูลขากลับไม่สำเร็จ",
    );

  return {
    rooms,
    vehicles,
    meetingBookings,
    vehicleBookings,
    vehicleTotal,
    loading,
    offline,
    busy,
    notice,
    setNotice,
    currentDate,
    version,
    refresh,
    submitMeeting,
    cancelMeeting,
    submitDeparture,
    submitReturn,
  };
}
