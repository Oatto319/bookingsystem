"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createMeetingBooking,
  createVehicleBooking,
  fetchBookingData,
  returnVehicleBooking,
} from "@/lib/booking-api";
import { sampleRooms, sampleVehicles } from "@/lib/booking-data";
import type { MeetingBooking, Notice, Room, Vehicle, VehicleBooking } from "@/types/booking";

export function localDateTime(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

export function useBookings() {
  const [rooms, setRooms] = useState<Room[]>(sampleRooms);
  const [vehicles, setVehicles] = useState<Vehicle[]>(sampleVehicles);
  const [meetingBookings, setMeetingBookings] = useState<MeetingBooking[]>([]);
  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [returningBooking, setReturningBooking] = useState<VehicleBooking | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const [endingOdometer, setEndingOdometer] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { catalog, meetings, vehicles: vehicleData } = await fetchBookingData();
      setRooms(catalog.rooms);
      setVehicles(catalog.vehicles);
      setMeetingBookings(meetings.bookings);
      setVehicleBookings(vehicleData.bookings);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const clock = setTimeout(() => {
      if (!cancelled) setCurrentDate(new Date());
    }, 0);
    void fetchBookingData()
      .then(({ catalog, meetings, vehicles: vehicleData }) => {
        if (cancelled) return;
        setRooms(catalog.rooms);
        setVehicles(catalog.vehicles);
        setMeetingBookings(meetings.bookings);
        setVehicleBookings(vehicleData.bookings);
        setOffline(false);
      })
      .catch(() => {
        if (!cancelled) setOffline(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(clock);
    };
  }, []);

  const runSubmission = async (
    event: FormEvent<HTMLFormElement>,
    submit: () => Promise<unknown>,
    successMessage: string,
    failureMessage: string,
    onSuccess?: () => void,
  ) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await submit();
      setNotice({ type: "success", text: successMessage });
      onSuccess?.();
      await refresh();
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : failureMessage,
      });
    } finally {
      setBusy(false);
    }
  };

  const submitMeeting = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    return runSubmission(
      event,
      () =>
        createMeetingBooking({
          roomCode: form.get("roomCode"),
          startAt: new Date(String(form.get("startAt"))).toISOString(),
          endAt: new Date(String(form.get("endAt"))).toISOString(),
          topic: form.get("topic"),
          attendees: Number(form.get("attendees")),
          requester: form.get("requester"),
        }),
      "บันทึกการจองห้องประชุมเรียบร้อยแล้ว",
      "บันทึกการจองไม่สำเร็จ",
      () => formElement.reset(),
    );
  };

  const submitDeparture = (event: FormEvent<HTMLFormElement>) => {
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    return runSubmission(
      event,
      () =>
        createVehicleBooking({
          vehicleCode: form.get("vehicleCode"),
          departedAt: new Date(String(form.get("departedAt"))).toISOString(),
          requester: form.get("requester"),
          destination: form.get("destination"),
          startingOdometer: Number(form.get("startingOdometer")),
          driver: form.get("driver"),
          note: form.get("note"),
        }),
      "บันทึกข้อมูลออกเดินทางแล้ว ขอให้เดินทางปลอดภัย",
      "บันทึกข้อมูลออกเดินทางไม่สำเร็จ",
      () => formElement.reset(),
    );
  };

  const submitReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!returningBooking) return Promise.resolve();
    return runSubmission(
      event,
      () =>
        returnVehicleBooking(returningBooking._id, {
          returnedAt: new Date(returnDate).toISOString(),
          endingOdometer: Number(endingOdometer),
        }),
      "บันทึกการกลับถึงสำนักงานและคำนวณระยะทางแล้ว",
      "บันทึกข้อมูลขากลับไม่สำเร็จ",
      () => {
        setReturningBooking(null);
        setEndingOdometer("");
      },
    );
  };

  return {
    rooms,
    vehicles,
    meetingBookings,
    vehicleBookings,
    offline,
    busy,
    notice,
    setNotice,
    returningBooking,
    setReturningBooking,
    returnDate,
    setReturnDate,
    endingOdometer,
    setEndingOdometer,
    currentDate,
    refresh,
    submitMeeting,
    submitDeparture,
    submitReturn,
  };
}
