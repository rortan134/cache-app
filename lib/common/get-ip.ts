import { findIp } from "@arcjet/ip";
import { headers } from "next/headers";

export async function getIp() {
    const headerItems = await headers();
    return findIp({ headers: headerItems }, { platform: "vercel" });
}
