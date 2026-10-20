import { requireUser } from "@/lib/session";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const auth = await requireUser();
  if (auth.response) return auth.response;
  return Response.json({ user: auth.user });
}
