type Bucket = {
  count: number;
  resetAt: number;
};

type ConsumeInput = {
  key: string;
  max: number;
  windowMs: number;
};

type ConsumeResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

const buckets = new Map<string, Bucket>();

function nowMs() {
  return Date.now();
}

export function getRequestIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) {
    return first;
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function consumeRateLimit(input: ConsumeInput): ConsumeResult {
  const now = nowMs();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    buckets.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      remaining: Math.max(input.max - 1, 0)
    };
  }

  current.count += 1;
  buckets.set(input.key, current);

  if (current.count > input.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
      remaining: 0
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    remaining: Math.max(input.max - current.count, 0)
  };
}

