"use client";

import { Badge } from "@/components/ui/badge";
import { RadioOff } from "lucide-react";
import { useOffline } from "next/offline";

export function OfflineBadge() {
    const isOffline = useOffline();

    if (!isOffline) {
        return null;
    }

    return (
        <Badge
            title="You are offline. Any changes you make may be lost until you regain connectivity."
            variant="outline"
        >
            <RadioOff aria-hidden className="size-4" focusable="false" />
            Offline
        </Badge>
    );
}
