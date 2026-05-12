/**
 * Base URL for the ASP.NET API.
 * Default empty: browser calls same origin `/api/...`, proxied to the backend via `next.config.ts` rewrites.
 * Set `NEXT_PUBLIC_API_URL` when the API is on another host (e.g. production).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "";
