export type Room = {
  code: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  color: string;
  active?: boolean;
};

export type Vehicle = {
  code: string;
  name: string;
  registration: string;
  seats: number;
  type: string;
  active?: boolean;
  /** เลขไมล์ล่าสุดของรถคันนี้ (จากทริปล่าสุด) */
  lastOdometer?: number | null;
};

export type Role = "admin" | "user";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  department: string;
};

export type ManagedUser = SessionUser & { active: boolean };

export type MeetingBooking = {
  _id: string;
  roomCode: string;
  roomName: string;
  startAt: string;
  endAt: string;
  topic: string;
  attendees: number;
  requester: string;
  requesterId?: string;
  department?: string;
  phone?: string;
};

export type VehicleBooking = {
  _id: string;
  vehicleCode: string;
  vehicleName: string;
  registration: string;
  status: "in_use" | "returned";
  createdBy?: string;
  departureLog: {
    departedAt: string;
    requester: string;
    destination: string;
    startingOdometer: number;
    driver: string;
    purpose?: string;
    passengers?: number;
    expectedReturnAt?: string | null;
    note?: string;
  };
  returnLog?: {
    returnedAt: string;
    endingOdometer: number;
    fuelLiters?: number | null;
    fuelCost?: number | null;
  } | null;
  totalDistance?: number | null;
};

export type LogbookQuery = {
  status: "all" | "in_use" | "returned";
  from: string;
  to: string;
  q: string;
  vehicleCode: string;
  page: number;
};

export type LogbookResult = { bookings: VehicleBooking[]; total: number; page: number; pages: number };

export type MonthlySummaryRow = {
  vehicleCode: string;
  vehicleName: string;
  registration: string;
  trips: number;
  distance: number;
  fuelLiters: number;
  fuelCost: number;
};

export type DashboardView = "overview" | "meeting" | "vehicle" | "logbook" | "admin";
export type Notice = { type: "success" | "error"; text: string };
