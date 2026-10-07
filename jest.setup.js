/**
 * Global Jest setup.
 *
 * Runs after the test framework is installed (setupFilesAfterFramework).
 * Mocks the Firebase app initialisation so that no real network calls or
 * SDK initialisation happens during any test run.
 */

// ─── Firebase app / config mock ────────────────────────────────────────────
// Intercept before any service module tries to call initializeApp(), etc.
jest.mock('./src/services/firebase/config', () => ({
  auth: { app: { name: '[DEFAULT]' }, currentUser: null },
  db: {},
  storage: {},
  default: { name: '[DEFAULT]' },
}));

// ─── Suppress console noise ────────────────────────────────────────────────
// Service files log warnings (e.g. missing native module) — hide in CI output.
const originalWarn = console.warn.bind(console);
console.warn = (...args) => {
  const msg = args[0] ?? '';
  if (typeof msg === 'string' && msg.includes('[TravelMate]')) return;
  originalWarn(...args);
};
