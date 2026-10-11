/**
 * Tiny in-memory sliding-window limiter for brute-force protection on auth endpoints.
 * State is per server process, which is fine for a single instance; swap for Redis when scaling out.
 */
interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket) return false;
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);
  if (bucket.hits.length === 0) {
    buckets.delete(key);
    return false;
  }
  return bucket.hits.length >= max;
}

export function recordHit(key: string): void {
  const bucket = buckets.get(key) || { hits: [] };
  bucket.hits.push(Date.now());
  buckets.set(key, bucket);
}

export function clearHits(key: string): void {
  buckets.delete(key);
}
