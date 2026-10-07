import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer?: any;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  memoryServer: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    let uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/campus_ambassador_db";

    cached.promise = (async () => {
      try {
        console.log(`Connecting to MongoDB at: ${uri.split("@").pop()}`);
        const m = await mongoose.connect(uri, opts);
        console.log("Connected to MongoDB successfully.");
        return m;
      } catch (err: any) {
        console.warn("Direct MongoDB connection failed:", err.message);
        console.log("Attempting fallback to in-memory MongoDB Server for seamless local operation...");
        try {
          const { MongoMemoryServer } = await import("mongodb-memory-server");
          if (!cached.memoryServer) {
            cached.memoryServer = await MongoMemoryServer.create();
          }
          const memUri = cached.memoryServer.getUri();
          console.log(`Connected to MongoMemoryServer at: ${memUri}`);
          const memConn = await mongoose.connect(memUri, { bufferCommands: false });
          return memConn;
        } catch (memErr: any) {
          console.error("Failed to connect to MongoMemoryServer:", memErr.message);
          throw new Error(`MongoDB connection failed: ${err.message}. Memory server error: ${memErr.message}`);
        }
      }
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
