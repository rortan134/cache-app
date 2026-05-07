import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

// NOTE: This catch-all route also mounts the @better-auth/stripe webhook
// handler at POST /api/auth/stripe/webhook. Ensure the Stripe Dashboard
// webhook endpoint is configured to exactly: {baseURL}/api/auth/stripe/webhook
// Better Auth includes a built-in rate limiter to help manage traffic and prevent abuse. By default, in production mode, the rate limiter is set to:
// Window: 60 seconds
// Max Requests: 100 requests
// Server-side requests made using auth.api aren't affected by rate limiting. Rate limits only apply to client-initiated requests.
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
