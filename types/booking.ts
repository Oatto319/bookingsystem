export type Room = {
  code: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  color: string;
};

export type Vehicle = {
  code: string;
  name: string;
  registration: string;
  seats: number;
  type: string;
};

export type MeetingBooking = {
  _id: string;
  roomCode: string;
  roomName: string;
  startAt: string;
  endAt: string;
  topic: string;
  attendees: number;
  requester: string;
};

export type VehicleBooking = {
  _id: string;
  vehicleCode: string;
  vehicleName: string;
  registration: string;
  status: "in_use" | "returned";
  departureLog: {
    departedAt: string;
    requester: string;
    destination: string;
    startingOdometer: number;
    driver: string;
    note?: string;
  };
  returnLog?: { returnedAt: string; endingOdometer: number } | null;
  totalDistance?: number | null;
};

export type DashboardView = "overview" | "meeting" | "vehicle" | "logbook";
export type Notice = { type: "success" | "error"; text: string };
