import { buildPageMetadata } from "@/app/metadata";
import { APP_NAME } from "@/lib/common/constants";
import { gtPublicString } from "@/lib/i18n/gt-public-json";
import type { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;

    return buildPageMetadata({
        description: gtPublicString(
            locale,
            "legal.terms.metadata.description",
            `Terms of Service for ${APP_NAME} — rules for using the service, accounts, and acceptable use.`
        ),
        keywords: ["terms of service", "terms", APP_NAME],
        locale,
        path: "/legal/terms-of-service",
        title: gtPublicString(
            locale,
            "legal.terms.metadata.title",
            "Terms of Service"
        ),
    });
}

export default function TermsOfServicePage() {
    return (
        <article className="flex flex-col gap-8 text-[0.95rem] text-stone-800 leading-relaxed">
            <header className="flex flex-col gap-3">
                <h1 className="font-semibold text-2xl text-stone-950 tracking-tight">
                    CachdApp, Inc Terms of Service
                </h1>
                <p>
                    <strong>Last Updated:</strong> March 31, 2026
                </p>
                <p>
                    If you signed a separate Cover Page to access the Product
                    with the same account, and that agreement has not ended, the
                    terms below do not apply to you. Instead, your separate
                    Cover Page applies to your use of the Product.
                </p>
                <p>
                    This Agreement is between CachdApp, Inc and the company or
                    person accessing or using the Product. This Agreement
                    consists of: (1) the Order Form below and (2) the Framework
                    Terms defined below.
                </p>
                <p>
                    If you are accessing or using the Product on behalf of your
                    company, you represent that you are authorized to accept
                    this Agreement on behalf of your company. By signing up,
                    accessing, or using the Product, Customer indicates its
                    acceptance of this Agreement and agrees to be bound by the
                    terms and conditions of this Agreement.
                </p>
            </header>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Cover Page
                </h2>

                <div className="flex flex-col gap-3">
                    <h3 className="font-semibold text-lg text-stone-950">
                        Order Form
                    </h3>

                    <p>
                        <strong>Framework Terms:</strong> This Order Form
                        incorporates and is governed by the Framework Terms that
                        are made up of the Key Terms below and the Common Paper{" "}
                        <a
                            className="text-stone-950 underline underline-offset-4"
                            href="https://commonpaper.com/standards/cloud-service-agreement/2.1/"
                            rel="noreferrer"
                            target="_blank"
                        >
                            Cloud Service Agreement Standard Terms Version 2.1
                        </a>
                        , which are incorporated by reference. Any modifications
                        to the Standard Terms made in the Cover Page will
                        control over conflicts with the Standard Terms.
                        Capitalized words have the meanings given in the Cover
                        Page or the Standard Terms.
                    </p>

                    <p>
                        <strong>Cloud Service:</strong> The Cloud Service is a
                        cross-platform bookmarking and content library that
                        aggregates, organizes, and surfaces the user&apos;s
                        saved links and media from supported third-party
                        platforms in a single interface, including via browser
                        extensions and connected accounts.
                    </p>

                    <p>
                        <strong>Order Date:</strong> The Effective Date
                    </p>

                    <p>
                        <strong>Subscription Period:</strong> 1 month(s)
                    </p>

                    <p>
                        Certain parts of the Product have different pricing
                        plans, which are available at Provider&apos;s{" "}
                        <a
                            className="text-stone-950 underline underline-offset-4"
                            href="https://cachd.app/pricing"
                            rel="noreferrer"
                            target="_blank"
                        >
                            pricing page
                        </a>
                        . Customer will pay Provider the applicable Fees based
                        on the Product tier and Customer&apos;s usage. Provider
                        may update Product pricing by giving at least 36 days
                        notice to Customer (including by email or notification
                        within the Product), and the change will apply in the
                        next Subscription Period.
                    </p>

                    <div className="flex flex-col gap-2">
                        <p>
                            <strong>Payment Process:</strong>
                        </p>
                        <p>
                            <strong>Automatic payment:</strong> Customer
                            authorizes Provider to bill and charge
                            Customer&apos;s payment method on file Monthly for
                            immediate payment or deduction without further
                            approval.
                        </p>
                    </div>

                    <p>
                        <strong>Non-Renewal Notice Period:</strong> At least 30
                        days before the end of the current Subscription Period.
                    </p>
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Key Terms
                </h2>

                <div className="flex flex-col gap-3">
                    <p>
                        <strong>Customer:</strong> The company or person who
                        accesses or uses the Product. If the person accepting
                        this Agreement is doing so on behalf of a company, all
                        use of the word &quot;Customer&quot; in the Agreement
                        will mean that company.
                    </p>

                    <p>
                        <strong>Provider:</strong> CachdApp, Inc
                    </p>

                    <p>
                        <strong>Effective Date:</strong> The date Customer first
                        accepts this Agreement.
                    </p>

                    <p>
                        <strong>Governing Law:</strong> The laws of the State of
                        Delaware
                    </p>

                    <p>
                        <strong>Chosen Courts:</strong> The state or federal
                        courts located in Delaware
                    </p>

                    <div className="flex flex-col gap-2">
                        <p>
                            <strong>Covered Claims:</strong>
                        </p>
                        <p>
                            <strong>Provider Covered Claims:</strong> Any
                            action, proceeding, or claim that the Cloud Service,
                            when used by Customer according to the terms of the
                            Agreement, violates, misappropriates, or otherwise
                            infringes upon anyone else&apos;s intellectual
                            property or other proprietary rights.
                        </p>
                        <p>
                            <strong>Customer Covered Claims:</strong> Any
                            action, proceeding, or claim that (1) the Customer
                            Content, when used according to the terms of the
                            Agreement, violates, misappropriates, or otherwise
                            infringes upon anyone else&apos;s intellectual
                            property or other proprietary rights; or (2) results
                            from Customer&apos;s breach or alleged breach of
                            Section 2.1 (Restrictions on Customer).
                        </p>
                    </div>

                    <p>
                        <strong>General Cap Amount:</strong> The fees paid or
                        payable by Customer to provider in the 12 month period
                        immediately before the claim
                    </p>

                    <div className="flex flex-col gap-2">
                        <p>
                            <strong>Notice Address:</strong>
                        </p>
                        <p>
                            <strong>For Provider:</strong> notices@cachd.app
                        </p>
                        <p>
                            <strong>For Customer:</strong> The main email
                            address on Customer&apos;s account
                        </p>
                    </div>
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-semibold text-stone-950 text-xl tracking-tight">
                    Attachments and Supplements
                </h2>
                <p>
                    <strong>DPA:</strong>{" "}
                    <a
                        className="text-stone-950 underline underline-offset-4"
                        href="https://www.cachd.app/dpa"
                        rel="noreferrer"
                        target="_blank"
                    >
                        https://www.cachd.app/dpa
                    </a>
                </p>
            </section>
        </article>
    );
}
