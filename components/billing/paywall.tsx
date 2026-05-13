import { SubscriptionUpgradeButton } from "@/components/billing/subscription";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { T, Var } from "gt-next";
import { ArrowUpRight } from "lucide-react";

export function InlinePaywallBanner() {
    return (
        <Alert>
            <Badge>PRO</Badge>
            <AlertTitle className="flex items-center font-medium text-sm">
                <T>Upgrade for full access to Cache and all integrations</T>
                &nbsp;—&nbsp;
                <SubscriptionUpgradeButton
                    className="p-0 underline"
                    size="sm"
                    variant="link"
                >
                    <T>Get Pro</T>
                    <ArrowUpRight className="ml-auto inline-block size-4 shrink-0 text-muted-foreground" />
                </SubscriptionUpgradeButton>
            </AlertTitle>
        </Alert>
    );
}

export function BlockPaywallBanner({ length }: BlockPaywallBannerProps) {
    return (
        <aside className="sticky top-20 z-20 -mx-2 sm:-mx-4">
            <div className="rounded-lg border border-border/70 bg-background/90 px-6 py-10 shadow-xl/5 backdrop-blur-lg sm:px-10">
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-y-10 text-center">
                    <div className="flex flex-col items-center gap-y-5">
                        <h1 className="font-semibold text-3xl md:text-4xl">
                            <T>
                                Access all <Var>{length}</Var> bookmarks.
                            </T>
                        </h1>
                        <T>
                            <p className="max-w-xl text-balance text-muted-foreground text-sm sm:text-base">
                                Keep exploring the whole library, unlock full
                                browsing &amp; pro features from{" "}
                                <span className="font-semibold text-foreground">
                                    8€/month
                                </span>{" "}
                                — cancel anytime.
                            </p>
                        </T>
                        <SubscriptionUpgradeButton
                            className="mx-auto w-fit rounded-full"
                            size="xl"
                        >
                            <T>Get Pro</T>
                            <ArrowUpRight className="ml-auto inline-block size-4 shrink-0 text-muted-foreground" />
                        </SubscriptionUpgradeButton>
                    </div>
                </div>
            </div>
        </aside>
    );
}

interface BlockPaywallBannerProps {
    length: number;
}
