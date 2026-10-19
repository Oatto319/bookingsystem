import { connectToDatabase } from "@/lib/mongodb";
import { MeetingRoom } from "@/models/meeting-room";
import { OfficeVehicle } from "@/models/office-vehicle";

const defaultRooms = [
  {
    code: "room-nara",
    name: "ห้องประชุมรวงข้าว",
    capacity: 12,
    location: "อาคารสำนักงาน ชั้น 2",
    amenities: ["จอแสดงผล", "กระดานไวท์บอร์ด"],
    color: "sage",
  },
  {
    code: "room-suan",
    name: "ห้องประชุมเกษตรก้าวหน้า",
    capacity: 24,
    location: "อาคารสำนักงาน ชั้น 3",
    amenities: ["โปรเจกเตอร์", "ระบบประชุมทางไกล"],
    color: "blue",
  },
  {
    code: "room-rimnam",
    name: "ห้องประชุมริมคลอง",
    capacity: 8,
    location: "อาคารสำนักงาน ชั้น 1",
    amenities: ["จอแสดงผล"],
    color: "amber",
  },
];

const defaultVehicles = [
  {
    code: "car-pickup",
    name: "รถกระบะ 4 ประตู",
    registration: "กษ 4521",
    seats: 5,
    type: "pickup",
  },
  {
    code: "car-van",
    name: "รถตู้สำนักงาน",
    registration: "นข 2084",
    seats: 11,
    type: "van",
  },
  {
    code: "car-sedan",
    name: "รถยนต์ส่วนกลาง",
    registration: "กษ 3190",
    seats: 5,
    type: "sedan",
  },
];

export async function ensureDefaultCatalog() {
  await connectToDatabase();

  await Promise.all([
    ...defaultRooms.map((room) =>
      MeetingRoom.updateOne({ code: room.code }, { $setOnInsert: room }, { upsert: true }),
    ),
    ...defaultVehicles.map((vehicle) =>
      OfficeVehicle.updateOne(
        { code: vehicle.code },
        { $setOnInsert: vehicle },
        { upsert: true },
      ),
    ),
  ]);
}
