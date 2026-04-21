import { APP_NAME } from "@/lib/constants";
import { buildLocaleAlternates } from "@/lib/i18n/alternates";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
    return {
        alternates: buildLocaleAlternates("/legal/privacy-policy"),
        description: `Privacy Policy for ${APP_NAME}.`,
        title: "Privacy Policy",
    };
}

function LinkText({
    children,
    href,
}: Readonly<{
    children: React.ReactNode;
    href: string;
}>) {
    return (
        <a
            className="text-stone-950 underline underline-offset-4"
            href={href}
            rel="noreferrer"
            target="_blank"
        >
            {children}
        </a>
    );
}

export default function PrivacyPolicyPage() {
    return (
        <article className="flex flex-col gap-8 text-[0.95rem] text-stone-800 leading-relaxed">
            <header className="flex flex-col gap-3">
                <h1 className="font-semibold text-2xl text-stone-950 tracking-tight">
                    Privacy Policy
                </h1>
                <p>
                    <strong>Last Updated:</strong> April 1, 2026
                </p>
                <p>
                    This Privacy Policy explains how CachdApp, Inc.
                    (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
                    collects, uses, stores, and shares personal information when
                    you use Cache, including when you sign in with Google or
                    connect Google to import content from Google Photos.
                </p>
                <p>
                    This page is intended to help users understand our data
                    practices generally and, specifically, how our application
                    interacts with Google user data under the Google API
                    Services User Data Policy.
                </p>
            </header>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Information We Collect
                </h2>
                <p>Depending on how you use the product, we may collect:</p>
                <p>
                    <strong>Account and profile information:</strong> your name,
                    email address, profile image, linked account identifiers,
                    and session data used to authenticate you and keep you
                    signed in.
                </p>
                <p>
                    <strong>Library data:</strong> links, metadata, thumbnails,
                    captions, source identifiers, timestamps, and similar
                    content you import, save, or organize in the product.
                </p>
                <p>
                    <strong>Payment and subscription information:</strong>{" "}
                    billing status, Stripe customer and subscription
                    identifiers, and related transaction metadata.
                </p>
                <p>
                    <strong>Operational data:</strong> device, browser, IP
                    address, user agent, logs, and feedback you submit to help
                    us secure, operate, and improve the service.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Google User Data
                </h2>
                <p>
                    If you use Google with Cache, we may access the following
                    categories of Google user data:
                </p>
                <p>
                    <strong>Google basic profile data:</strong> your Google
                    account identifier, name, email address, and profile photo
                    through the Google sign-in scopes <code>openid</code>,{" "}
                    <code>email</code>, and <code>profile</code>.
                </p>
                <p>
                    <strong>Google Photos Picker data:</strong> when you choose
                    to connect Google Photos, we request read-only access
                    through the Google Photos Picker scope{" "}
                    <code>
                        https://www.googleapis.com/auth/photospicker.mediaitems.readonly
                    </code>
                    . This lets the app create a picker session, display your
                    selected items for import, and retrieve metadata needed to
                    import the items you choose.
                </p>
                <p>
                    For selected Google Photos items, this may include media
                    item identifiers, file names, creation times, and temporary
                    Google-hosted URLs such as preview or base URLs returned by
                    Google for the chosen media.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    How We Use Google User Data
                </h2>
                <p>We use Google user data only for the following purposes:</p>
                <p>
                    <strong>Authentication:</strong> to let you sign in,
                    identify your account, and maintain your session in Cache.
                </p>
                <p>
                    <strong>Account linking:</strong> to connect your Google
                    account to your existing Cache account so you can use Google
                    as a sign-in or import source.
                </p>
                <p>
                    <strong>Google Photos import:</strong> to create and manage
                    Google Photos Picker sessions, let you choose specific media
                    items, and import the items you selected into your Cache
                    library.
                </p>
                <p>
                    <strong>Service operations and security:</strong> to
                    troubleshoot authentication and import issues, prevent
                    abuse, maintain product functionality, and comply with legal
                    obligations.
                </p>
                <p>
                    We do not use Google user data for advertising, we do not
                    sell Google user data, and we do not use Google user data to
                    train generalized AI or machine learning models.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    What We Store
                </h2>
                <p>
                    When you connect Google, we may store Google-related account
                    records and tokens associated with your linked account, such
                    as access tokens, refresh tokens, token expiry times, your
                    Google account identifier, and approved scopes, so the app
                    can maintain the connection and complete requested actions.
                </p>
                <p>
                    When you import from Google Photos, we store the imported
                    library records in our application database, including the
                    selected item&apos;s source identifier, filename or caption,
                    creation timestamp, thumbnail URL, and media URL as returned
                    by Google at the time of import.
                </p>
                <p>
                    We store only the Google user data reasonably necessary to
                    provide the features you request.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Sharing of Google User Data
                </h2>
                <p>
                    We do not sell Google user data. We do not share Google user
                    data with third parties except in the limited circumstances
                    below:
                </p>
                <p>
                    <strong>
                        Service providers and infrastructure vendors:
                    </strong>{" "}
                    we may share data with vendors that host, secure, support,
                    or process data on our behalf, such as cloud hosting,
                    authentication, database, logging, customer support, and
                    payment providers. These providers may access data only as
                    needed to perform services for us.
                </p>
                <p>
                    <strong>At your direction:</strong> when you intentionally
                    connect third-party services or take actions that require us
                    to transmit data to complete your request.
                </p>
                <p>
                    <strong>Legal or safety reasons:</strong> when disclosure is
                    reasonably necessary to comply with applicable law,
                    regulation, legal process, or enforceable governmental
                    request, or to protect the rights, safety, and security of
                    our users, our company, or others.
                </p>
                <p>
                    <strong>Business transfers:</strong> as part of a merger,
                    acquisition, financing, or sale of assets, subject to
                    standard confidentiality and legal protections.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Data Storage and Protection
                </h2>
                <p>
                    We store personal data, including Google user data, in
                    systems we or our service providers operate for the purpose
                    of delivering the service.
                </p>
                <p>
                    We use administrative, technical, and organizational
                    safeguards designed to protect personal data, including
                    access restrictions, authenticated service requests, secret
                    management for credentials, and internal logging and
                    monitoring practices intended to reduce unauthorized access,
                    disclosure, or misuse.
                </p>
                <p>
                    No method of transmission or storage is completely secure,
                    and we cannot guarantee absolute security.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Data Retention
                </h2>
                <p>
                    We retain personal data, including Google user data, for as
                    long as reasonably necessary to provide the service you
                    requested, maintain your account, comply with legal, tax,
                    accounting, and security obligations, resolve disputes, and
                    enforce our agreements.
                </p>
                <p>
                    Linked-account tokens and account connection records may be
                    retained while your account remains active and while the
                    Google connection is needed for product functionality.
                </p>
                <p>
                    Imported Google Photos library records may remain in your
                    Cache library until they are removed from our systems
                    following your deletion request, account closure, or other
                    internal retention requirements.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Deletion and Revocation
                </h2>
                <p>
                    You can stop future Google data access by no longer using
                    Google sign-in or Google Photos import and by revoking
                    Cache&apos;s access from your Google account permissions at{" "}
                    <LinkText href="https://myaccount.google.com/permissions">
                        myaccount.google.com/permissions
                    </LinkText>
                    .
                </p>
                <p>
                    To request deletion of your Cache account or Google-related
                    data stored by us, contact{" "}
                    <LinkText href="mailto:notices@cachd.app">
                        notices@cachd.app
                    </LinkText>
                    . Please include the email address associated with your
                    account and enough detail for us to identify your request.
                </p>
                <p>
                    We will review and process verified deletion requests within
                    a commercially reasonable timeframe, subject to any legal
                    retention obligations, fraud prevention needs, payment
                    recordkeeping requirements, or other legitimate business
                    needs.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Other Disclosures
                </h2>
                <p>
                    Our use of information received from Google APIs will adhere
                    to the{" "}
                    <LinkText href="https://developers.google.com/terms/api-services-user-data-policy">
                        Google API Services User Data Policy
                    </LinkText>
                    , including the Limited Use requirements where applicable.
                </p>
                <p>
                    If you have questions about this Privacy Policy or our data
                    practices, contact{" "}
                    <LinkText href="mailto:notices@cachd.app">
                        notices@cachd.app
                    </LinkText>
                    .
                </p>
            </section>
        </article>
    );
}
