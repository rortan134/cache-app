"use client";

import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { T } from "gt-next";
import { DownloadIcon } from "lucide-react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { isAbortError } from "@/lib/common/abort";
import { cn } from "@/lib/common/cn";
import { APP_NAME } from "@/lib/common/constants";
import { saveFile } from "@/lib/common/file";
import { fetchWithTimeout } from "@/lib/common/timeout";

const FETCH_TIMEOUT_MS = 10_000;

async function fetchLogo(url: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetchWithTimeout(url, { signal }, FETCH_TIMEOUT_MS);
    if (!response.ok) {
        throw new Error(`Failed to fetch logo image (${response.status})`);
    }
    return response.blob();
}

interface BrandLogoProps
    extends Omit<React.ComponentProps<typeof Link>, "href"> {
    href?: string;
    src: StaticImageData;
}

export function BrandLogo({ href, src, className, ...props }: BrandLogoProps) {
    const abortControllerRef = React.useRef<AbortController | null>(null);

    React.useEffect(() => () => abortControllerRef.current?.abort(), []);

    const handleSaveLogo = useStableCallback(async () => {
        abortControllerRef.current?.abort();

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const blob = await fetchLogo(src.src, controller.signal);
            await saveFile(blob, {
                description: "PNG image",
                extension: "png",
                name: "cache-logo",
            });
        } catch (error) {
            if (isAbortError(error)) {
                return;
            }
            console.error("Failed to save logo image", error);
        }
    });

    const logoClassName = cn(
        "w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        className
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger
                aria-label={APP_NAME}
                render={
                    href ? (
                        <Link
                            {...props}
                            className={logoClassName}
                            draggable="false"
                            href={href}
                        />
                    ) : (
                        <div className={logoClassName} tabIndex={-1} />
                    )
                }
            >
                <Image
                    alt={APP_NAME}
                    className="block h-auto w-45 select-none"
                    draggable="false"
                    fetchPriority="high"
                    sizes="180px"
                    src={src}
                />
            </ContextMenuTrigger>
            <ContextMenuPopup className="min-w-44">
                <ContextMenuItem onClick={handleSaveLogo}>
                    <DownloadIcon className="size-4 text-muted-foreground" />
                    <T>Save logo as PNG</T>
                </ContextMenuItem>
            </ContextMenuPopup>
        </ContextMenu>
    );
}
