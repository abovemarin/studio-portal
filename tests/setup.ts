// Safety-net env vars. The modules that actually read these (lib/auth, lib/email)
// are mocked in each test file via vi.mock — these values only matter if a mock
// is accidentally missing and the real module tries to parse process.env.
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.BETTER_AUTH_SECRET = 'test-secret-that-is-at-least-32-characters-long'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.EMAIL_FROM = 'test@example.com'
// NODE_ENV intentionally omitted — Vitest sets it to 'test' automatically.
// RESEND_API_KEY intentionally omitted — optional when NODE_ENV !== 'production'
