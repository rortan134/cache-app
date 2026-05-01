import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

// NOTE: This catch-all route also mounts the @better-auth/stripe webhook
// handler at POST /api/auth/stripe/webhook. Ensure the Stripe Dashboard
// webhook endpoint is configured to exactly: {baseURL}/api/auth/stripe/webhook
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
