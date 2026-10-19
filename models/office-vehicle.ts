import { model, models, Schema, type InferSchemaType } from "mongoose";

const officeVehicleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    registration: { type: String, required: true, trim: true },
    seats: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, enum: ["pickup", "van", "sedan"] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type OfficeVehicleRecord = InferSchemaType<typeof officeVehicleSchema>;
export const OfficeVehicle =
  models.OfficeVehicle ?? model("OfficeVehicle", officeVehicleSchema);
