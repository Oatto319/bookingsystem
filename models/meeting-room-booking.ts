import { model, models, Schema, type InferSchemaType } from "mongoose";

const meetingRoomBookingSchema = new Schema(
  {
    roomCode: {
      type: String,
      required: true,
      ref: "MeetingRoom",
      index: true,
    },
    roomName: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    topic: { type: String, required: true, trim: true, maxlength: 160 },
    attendees: { type: Number, required: true, min: 1 },
    requester: { type: String, required: true, trim: true, maxlength: 100 },
    requesterId: { type: String, default: "", index: true }, // username ของผู้จอง (ใช้ตรวจสิทธิ์ยกเลิก/แก้ไข)
    department: { type: String, trim: true, maxlength: 100, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, default: "" },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      index: true,
    },
  },
  { timestamps: true },
);

meetingRoomBookingSchema.index({ roomCode: 1, startAt: 1, endAt: 1 });

export type MeetingRoomBookingRecord = InferSchemaType<
  typeof meetingRoomBookingSchema
>;
export const MeetingRoomBooking =
  models.MeetingRoomBooking ??
  model("MeetingRoomBooking", meetingRoomBookingSchema);
