/**
 * Share link generation.
 *
 * Firebase Dynamic Links was shut down in August 2025.  This module replaces it
 * with links to the Firebase Hosting-backed web redirect page at
 * https://travelmate-2f670.web.app/trip/{postId}.
 *
 * The web page (public/trip.html) attempts to open the app via the custom
 * URL scheme travelmate://shared-trip/{postId} and falls back to an in-browser
 * read-only preview when the app is not installed.
 *
 * For true App Links (Android) / Universal Links (iOS) — which open the app
 * directly from the browser without the JS redirect step — you must:
 *   Android: add the SHA-256 release fingerprint to public/.well-known/assetlinks.json
 *   iOS:     add the `associatedDomains` entitlement in app.json and verify via Apple
 */

const HOSTING_BASE = 'https://travelmate-2f670.web.app';

/** Shareable URL for a shared-itinerary post. */
export const generateShareLink = (postId: string): string =>
  `${HOSTING_BASE}/trip/${postId}`;

/** Custom-scheme deep link used inside the app and on the redirect page. */
export const generateAppSchemeLink = (postId: string): string =>
  `travelmate://shared-trip/${postId}`;
