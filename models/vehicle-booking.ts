import { model, models, Schema, type InferSchemaType } from "mongoose";

const departureLogSchema = new Schema(
  {
    departedAt: { type: Date, required: true },
    requester: { type: String, required: true, trim: true, maxlength: 100 },
    destination: { type: String, required: true, trim: true, maxlength: 200 },
    startingOdometer: { type: Number, required: true, min: 0 },
    driver: { type: String, required: true, trim: true, maxlength: 100 },
    purpose: { type: String, trim: true, maxlength: 200, default: "" },
    passengers: { type: Number, min: 0, default: 0 },
    expectedReturnAt: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const returnLogSchema = new Schema(
  {
    returnedAt: { type: Date, required: true },
    endingOdometer: { type: Number, required: true, min: 0 },
    fuelLiters: { type: Number, min: 0, default: null },
    fuelCost: { type: Number, min: 0, default: null },
  },
  { _id: false },
);

const vehicleBookingSchema = new Schema(
  {
    vehicleCode: {
      type: String,
      required: true,
      ref: "OfficeVehicle",
    },
    vehicleName: { type: String, required: true },
    registration: { type: String, required: true },
    createdBy: { type: String, default: "", index: true }, // username ของผู้บันทึก
    departureLog: { type: departureLogSchema, required: true },
    returnLog: { type: returnLogSchema, default: null },
    totalDistance: { type: Number, min: 0, default: null },
    distanceUnit: { type: String, enum: ["km"], default: "km" },
    status: {
      type: String,
      enum: ["in_use", "returned"],
      default: "in_use",
      index: true,
    },
  },
  { timestamps: true },
);

vehicleBookingSchema.index({ vehicleCode: 1, "departureLog.departedAt": -1 });
// รถหนึ่งคันมีรายการ in_use ได้เพียงรายการเดียว (กันการกดจองพร้อมกัน)
vehicleBookingSchema.index(
  { vehicleCode: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "in_use" },
    name: "vehicleCode_in_use_unique",
  },
);

export type VehicleBookingRecord = InferSchemaType<typeof vehicleBookingSchema>;
export const VehicleBooking =
  models.VehicleBooking ?? model("VehicleBooking", vehicleBookingSchema);
