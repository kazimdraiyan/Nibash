import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "./rateLimit.js";

test("rateLimiter: allows requests under the maximum limit", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 3 });

  let nextCalled = 0;
  const mockReq = { ip: "127.0.0.1", socket: {} } as any;
  const mockRes = {
    status: () => mockRes,
    json: () => mockRes,
  } as any;
  const mockNext = () => { nextCalled++; };

  limiter(mockReq, mockRes, mockNext);
  limiter(mockReq, mockRes, mockNext);
  limiter(mockReq, mockRes, mockNext);

  assert.equal(nextCalled, 3);
});

test("rateLimiter: blocks requests exceeding the maximum limit with 429", () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2, message: "Rate limit exceeded" });

  let statusSent: number | null = null;
  let jsonSent: any = null;
  let nextCalled = 0;

  const mockReq = { ip: "10.0.0.1", socket: {} } as any;
  const mockRes = {
    status: (code: number) => {
      statusSent = code;
      return mockRes;
    },
    json: (body: any) => {
      jsonSent = body;
      return mockRes;
    },
  } as any;
  const mockNext = () => { nextCalled++; };

  limiter(mockReq, mockRes, mockNext);
  limiter(mockReq, mockRes, mockNext);
  limiter(mockReq, mockRes, mockNext); // 3rd request should fail

  assert.equal(nextCalled, 2);
  assert.equal(statusSent, 429);
  assert.deepEqual(jsonSent, { error: "Rate limit exceeded" });
});
