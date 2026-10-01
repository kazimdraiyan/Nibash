import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, number[]>();

  // Cleanup interval every 5 minutes to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requests.entries()) {
      const valid = timestamps.filter((t) => now - t < options.windowMs);
      if (valid.length === 0) {
        requests.delete(ip);
      } else {
        requests.set(ip, valid);
      }
    }
  }, 5 * 60 * 1000);

  // Allow unreferencing the timer so it doesn't hold Node process open in tests
  if (interval.unref) {
    interval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const clientTimestamps = requests.get(ip) || [];
    const recent = clientTimestamps.filter((t) => now - t < options.windowMs);

    if (recent.length >= options.max) {
      res.status(429).json({
        error: options.message || "Too many requests, please slow down.",
      });
      return;
    }

    recent.push(now);
    requests.set(ip, recent);
    next();
  };
}

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: "Too many search requests. Please slow down.",
});
