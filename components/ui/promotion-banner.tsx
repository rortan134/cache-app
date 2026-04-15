"use client";

import { PricingUpgradeButton } from "@/components/billing/pricing-upgrade-button";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";

function useLocaleParam(): string {
    const params = useParams<{ locale?: string | string[] }>();
    const locale = params.locale;
    if (Array.isArray(locale)) {
        return locale[0] ?? "en";
    }
    return locale ?? "en";
}

function InlinePromotionBanner() {
    const locale = useLocaleParam();

    return (
        <aside className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2">
            <Badge>PRO</Badge>
            <div className="flex items-center font-medium text-sm text-foreground">
                Upgrade for full access to Cache and all
                integrations&nbsp;—&nbsp;
                <PricingUpgradeButton
                    className="p-0 underline"
                    fullWidth={false}
                    locale={locale}
                    size="sm"
                    variant="link"
                >
                    Get Pro
                </PricingUpgradeButton>
            </div>
        </aside>
    );
}

function BlockPromotionBanner({ length }: { length: number }) {
    const locale = useLocaleParam();

    return (
        <aside className="sticky top-20 z-20 -mx-2 sm:-mx-4">
            <div className="rounded-[2rem] border border-border/70 bg-background/90 px-6 py-10 shadow-xl/5 backdrop-blur-lg sm:px-10">
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-y-10 text-center">
                    <div className="flex flex-col items-center gap-y-5">
                        <h1 className="font-semibold text-3xl md:text-4xl">
                            Access all {length} bookmarks.
                        </h1>
                        <p className="max-w-xl text-balance text-muted-foreground text-sm sm:text-base">
                            Keep exploring the whole library, unlock full
                            browsing &amp; pro features from{" "}
                            <span className="font-semibold text-foreground">
                                5€/month
                            </span>{" "}
                            — cancel anytime.
                        </p>
                        <PricingUpgradeButton
                            className="mx-auto w-fit rounded-full"
                            locale={locale}
                        >
                            Get Pro
                        </PricingUpgradeButton>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export { BlockPromotionBanner, InlinePromotionBanner };
