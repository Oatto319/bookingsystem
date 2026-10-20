import { setServers } from "node:dns";
import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

const FALLBACK_DNS = ["8.8.8.8", "8.8.4.4", "1.1.1.1"];

function isSrvDnsError(error: unknown) {
  const e = error as { code?: string; syscall?: string } | undefined;
  return (
    e?.syscall === "querySrv" &&
    ["ECONNREFUSED", "ETIMEOUT", "ENOTFOUND", "ESERVFAIL"].includes(e.code ?? "")
  );
}

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }
  if (cached.conn) return cached.conn;

  const isSrv = mongoUri.startsWith("mongodb+srv://");
  const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  if (isSrv && dnsServers?.length) {
    setServers(dnsServers);
  }

  if (!cached.promise) {
    const connect = () =>
      mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

    cached.promise = connect()
      .catch((error: unknown) => {
        // DNS ของเครื่อง/เราเตอร์ไม่รองรับ SRV lookup -> ลองใหม่ด้วย Public DNS
        if (isSrv && isSrvDnsError(error)) {
          console.warn("SRV lookup failed, retrying with public DNS servers...");
          setServers(FALLBACK_DNS);
          return connect();
        }
        throw error;
      })
      .catch((error: unknown) => {
        cached.promise = null;
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}