import mongoose from "mongoose";
import { seedDefaultCatalog } from "@/lib/catalog";
import { MeetingRoomBooking } from "@/models/meeting-room-booking";
import { VehicleBooking } from "@/models/vehicle-booking";

async function main() {
  await seedDefaultCatalog();
  // สร้างดัชนี (รวม partial unique index ของรถ) ให้พร้อมก่อนเปิดใช้งาน
  await Promise.all([MeetingRoomBooking.syncIndexes(), VehicleBooking.syncIndexes()]);
  console.log("✔ seed ห้องประชุม รถ และผู้ดูแลระบบเริ่มต้นเรียบร้อย");
}

main()
  .catch((error) => {
    console.error("seed ไม่สำเร็จ:", error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
