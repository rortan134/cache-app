import { ORPCInstrumentation } from "@orpc/otel";
import { registerOTel } from "@vercel/otel";

export function register() {
    registerOTel({
        instrumentations: [new ORPCInstrumentation()],
        serviceName: "cache-app",
    });
}
