"use client";

import { useMemo, useState } from "react";
import {
  MeetingBookingPage,
} from "@/components/dashboard/meeting-booking-page";
import { OverviewPage } from "@/components/dashboard/overview-page";
import { DashboardShell } from "@/components/dashboard/shell";
import { VehicleBookingPage } from "@/components/dashboard/vehicle-booking-page";
import { VehicleLogbookPage } from "@/components/dashboard/vehicle-logbook-page";
import { ReturnVehicleModal } from "@/components/dashboard/return-vehicle-modal";
import { localDateTime, useBookings } from "@/hooks/use-bookings";
import type { DashboardView, VehicleBooking } from "@/types/booking";

export default function BookingDashboard() {
  const [view, setView] = useState<DashboardView>("overview");
  const bookings = useBookings();

  const inUseCount = bookings.vehicleBookings.filter(
    (booking) => booking.status === "in_use",
  ).length;
  const todayCount = bookings.meetingBookings.filter(
    (booking) =>
      bookings.currentDate !== null &&
      new Date(booking.startAt).toDateString() === bookings.currentDate.toDateString(),
  ).length;
  const occupiedRoomCodes = useMemo(() => {
    const now = bookings.currentDate;
    if (!now) return new Set<string>();
    return new Set(
      bookings.meetingBookings
        .filter((booking) => new Date(booking.startAt) <= now && new Date(booking.endAt) > now)
        .map((booking) => booking.roomCode),
    );
  }, [bookings.currentDate, bookings.meetingBookings]);

  function startReturn(booking: VehicleBooking) {
    bookings.setReturningBooking(booking);
    bookings.setReturnDate(localDateTime());
    bookings.setEndingOdometer(String(booking.departureLog.startingOdometer));
  }

  return (
    <DashboardShell
      view={view}
      setView={setView}
      inUseCount={inUseCount}
      currentDate={bookings.currentDate}
      offline={bookings.offline}
      notice={bookings.notice}
      onDismissNotice={() => bookings.setNotice(null)}
    >
      {view === "overview" && (
        <OverviewPage
          rooms={bookings.rooms}
          vehicles={bookings.vehicles}
          meetingBookings={bookings.meetingBookings}
          vehicleBookings={bookings.vehicleBookings}
          occupiedRoomCodes={occupiedRoomCodes}
          todayCount={todayCount}
          currentDate={bookings.currentDate}
          onNavigate={setView}
        />
      )}
      {view === "meeting" && (
        <MeetingBookingPage
          rooms={bookings.rooms}
          occupiedRoomCodes={occupiedRoomCodes}
          busy={bookings.busy}
          onSubmit={bookings.submitMeeting}
        />
      )}
      {view === "vehicle" && (
        <VehicleBookingPage
          vehicles={bookings.vehicles}
          bookings={bookings.vehicleBookings}
          busy={bookings.busy}
          onSubmit={bookings.submitDeparture}
        />
      )}
      {view === "logbook" && (
        <VehicleLogbookPage
          bookings={bookings.vehicleBookings}
          onNavigate={() => setView("vehicle")}
          onStartReturn={startReturn}
        />
      )}
      {bookings.returningBooking && (
        <ReturnVehicleModal
          booking={bookings.returningBooking}
          returnDate={bookings.returnDate}
          endingOdometer={bookings.endingOdometer}
          busy={bookings.busy}
          onDateChange={bookings.setReturnDate}
          onOdometerChange={bookings.setEndingOdometer}
          onClose={() => bookings.setReturningBooking(null)}
          onSubmit={bookings.submitReturn}
        />
      )}
    </DashboardShell>
  );
}
