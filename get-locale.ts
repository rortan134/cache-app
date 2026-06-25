import { locale } from "next/root-params";

export default async function getLocale(): Promise<string> {
    return await locale();
}
