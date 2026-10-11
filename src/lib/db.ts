import mongoose from "mongoose";
import dns from "dns";

// Fix Node.js SRV record resolution issue on Windows for mongodb+srv://
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in restricted environments
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

let cachedResolvedUri: string | null = (globalThis as any)._mongoResolvedUri || null;

async function resolveMongoSrvUri(uri: string): Promise<string> {
  if (!uri.startsWith("mongodb+srv://")) {
    return uri;
  }
  if (cachedResolvedUri) {
    return cachedResolvedUri;
  }
  if ((globalThis as any)._mongoResolvedUri) {
    cachedResolvedUri = (globalThis as any)._mongoResolvedUri;
    return cachedResolvedUri!;
  }

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1"]);

    const parsed = new URL(uri.replace("mongodb+srv://", "http://"));
    const host = parsed.hostname;
    const auth = parsed.username
      ? `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}@`
      : "";
    const pathname = parsed.pathname;

    const [srvRecords, txtRecords] = await Promise.all([
      resolver.resolveSrv(`_mongodb._tcp.${host}`),
      resolver.resolveTxt(host).catch(() => []),
    ]);

    if (!srvRecords || srvRecords.length === 0) {
      return uri;
    }

    const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(",");
    const queryParams = new URLSearchParams(parsed.search.replace(/^\?/, ""));
    queryParams.set("ssl", "true");

    if (txtRecords && txtRecords.length > 0) {
      for (const chunk of txtRecords) {
        const txtStr = Array.isArray(chunk) ? chunk.join("") : chunk;
        const txtParams = new URLSearchParams(txtStr);
        for (const [key, val] of txtParams.entries()) {
          if (!queryParams.has(key)) {
            queryParams.set(key, val);
          }
        }
      }
    }

    const resolved = `mongodb://${auth}${hosts}${pathname}?${queryParams.toString()}`;
    cachedResolvedUri = resolved;
    (globalThis as any)._mongoResolvedUri = resolved;
    return resolved;
  } catch (srvErr: any) {
    console.warn("SRV resolution fallback error:", srvErr.message);
    return uri;
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If connection is already open, return it immediately without any delay
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    let rawUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_ambassador_db";
    // Strip accidental duplicate prefix like MONGODB_URI=MONGODB_URI=
    if (rawUri.startsWith("MONGODB_URI=")) {
      rawUri = rawUri.replace(/^MONGODB_URI=/, "").trim();
    }

    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    };

    cached.promise = (async () => {
      const connectionUri = await resolveMongoSrvUri(rawUri);
      const m = await mongoose.connect(connectionUri, opts);
      console.log("Connected to MongoDB database successfully.");
      return m;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
