export const GENERIC_EMAIL_DOMAINS = [
    "aol.com",
    "att.net",
    "comcast.net",
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
    "me.com",
    "msn.com",
    "outlook.com",
    "protonmail.com",
    "verizon.net",
    "yahoo.com",
] as const satisfies readonly string[];

export const isGenericEmail = (email: string) =>
    GENERIC_EMAIL_DOMAINS.some((domain) => email.endsWith(`@${domain}`));
