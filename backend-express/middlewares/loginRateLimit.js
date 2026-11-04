const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getKey = (req) => normalizeEmail(req.body && req.body.email) || `ip:${req.ip || 'unknown'}`;

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (now >= entry.resetAt) attempts.delete(key);
  }
}, WINDOW_MS);
cleanup.unref();

const loginRateLimit = (req, res, next) => {
  const key = getKey(req);
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Terlalu banyak percobaan login. Coba lagi nanti.' });
  }

  if (!entry || now >= entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }

  next();
};

const clearLoginAttempts = (email) => {
  attempts.delete(normalizeEmail(email));
};

module.exports = {
  loginRateLimit,
  clearLoginAttempts
};
