import { model, models, Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 50 },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    department: { type: String, trim: true, maxlength: 100, default: "" },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema>;
export const User = models.User ?? model("User", userSchema);
