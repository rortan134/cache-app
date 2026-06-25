import { headers } from "next/headers";

export default async function getLocale(): Promise<string> {
    const headersList = await headers();
    return headersList.get("x-generaltranslation-locale") ?? "en-US";
}
