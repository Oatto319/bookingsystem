import { model, models, Schema, type InferSchemaType } from "mongoose";

const meetingRoomSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true },
    amenities: { type: [String], default: [] },
    color: { type: String, required: true, default: "sage" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type MeetingRoomRecord = InferSchemaType<typeof meetingRoomSchema>;
export const MeetingRoom =
  models.MeetingRoom ?? model("MeetingRoom", meetingRoomSchema);
