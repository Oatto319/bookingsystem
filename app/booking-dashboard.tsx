"use client";

import { useMemo, useState } from "react";
import { AdminPage } from "@/components/dashboard/admin-page";
import { ChangePasswordModal } from "@/components/dashboard/change-password-modal";
import { LoginPage } from "@/components/dashboard/login-page";
import { MeetingBookingPage } from "@/components/dashboard/meeting-booking-page";
import { OverviewPage } from "@/components/dashboard/overview-page";
import { ReturnVehicleModal } from "@/components/dashboard/return-vehicle-modal";
import { LoadingSkeleton } from "@/components/dashboard/shared";
import { DashboardShell } from "@/components/dashboard/shell";
import { VehicleBookingPage } from "@/components/dashboard/vehicle-booking-page";
import { VehicleLogbookPage } from "@/components/dashboard/vehicle-logbook-page";
import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import type { DashboardView, SessionUser, VehicleBooking } from "@/types/booking";

export default function BookingDashboard() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <div className="login-shell"><LoadingSkeleton /></div>;
  }
  if (auth.status !== "authenticated" || !auth.user) {
    return <LoginPage unavailable={auth.status === "unavailable"} onLogin={auth.login} />;
  }
  return <Dashboard user={auth.user} onLogout={auth.logout} onExpire={auth.expire} />;
}

function Dashboard({ user, onLogout, onExpire }: { user: SessionUser; onLogout: () => void; onExpire: () => void }) {
  const [view, setView] = useState<DashboardView>("overview");
  const [returning, setReturning] = useState<VehicleBooking | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const bookings = useBookings({ enabled: true, onUnauthorized: onExpire });

  const inUseCount = bookings.vehicleBookings.filter((booking) => booking.status === "in_use").length;
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

  return (
    <DashboardShell
      view={view}
      setView={setView}
      inUseCount={inUseCount}
      currentDate={bookings.currentDate}
      offline={bookings.offline}
      notice={bookings.notice}
      user={user}
      onDismissNotice={() => bookings.setNotice(null)}
      onLogout={onLogout}
      onChangePassword={() => setChangingPassword(true)}
    >
      {bookings.loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {view === "overview" && (
            <OverviewPage
              rooms={bookings.rooms}
              vehicles={bookings.vehicles}
              meetingBookings={bookings.meetingBookings}
              vehicleBookings={bookings.vehicleBookings}
              vehicleTotal={bookings.vehicleTotal}
              occupiedRoomCodes={occupiedRoomCodes}
              todayCount={todayCount}
              currentDate={bookings.currentDate}
              onNavigate={setView}
            />
          )}
          {view === "meeting" && (
            <MeetingBookingPage
              rooms={bookings.rooms}
              bookings={bookings.meetingBookings}
              occupiedRoomCodes={occupiedRoomCodes}
              currentDate={bookings.currentDate}
              user={user}
              busy={bookings.busy}
              offline={bookings.offline}
              onSubmit={bookings.submitMeeting}
              onCancel={bookings.cancelMeeting}
            />
          )}
          {view === "vehicle" && (
            <VehicleBookingPage
              vehicles={bookings.vehicles}
              bookings={bookings.vehicleBookings}
              currentDate={bookings.currentDate}
              user={user}
              busy={bookings.busy}
              offline={bookings.offline}
              onSubmit={bookings.submitDeparture}
            />
          )}
          {view === "logbook" && (
            <VehicleLogbookPage
              vehicles={bookings.vehicles}
              user={user}
              version={bookings.version}
              currentDate={bookings.currentDate}
              offline={bookings.offline}
              onNavigate={() => setView("vehicle")}
              onStartReturn={setReturning}
              onUnauthorized={onExpire}
            />
          )}
          {view === "admin" && user.role === "admin" && (
            <AdminPage
              currentUserId={user.id}
              onChanged={bookings.refresh}
              onUnauthorized={onExpire}
              onNotice={(type, text) => bookings.setNotice({ type, text })}
            />
          )}
        </>
      )}
      {returning && (
        <ReturnVehicleModal
          booking={returning}
          now={bookings.currentDate}
          busy={bookings.busy}
          offline={bookings.offline}
          onClose={() => setReturning(null)}
          onSubmit={(values) => bookings.submitReturn(returning, values)}
        />
      )}
      {changingPassword && (
        <ChangePasswordModal
          onClose={() => setChangingPassword(false)}
          onDone={() => {
            setChangingPassword(false);
            bookings.setNotice({ type: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
          }}
        />
      )}
    </DashboardShell>
  );
}
