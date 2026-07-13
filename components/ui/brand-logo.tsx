"use client";

import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/common/cn";
import { saveFile } from "@/lib/common/file";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { DownloadIcon } from "lucide-react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

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
        abortControllerRef.current = new AbortController();
        try {
            await saveFile(
                fetch(src.src, {
                    signal: abortControllerRef.current.signal,
                }).then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `Failed to fetch logo image (${response.status})`
                        );
                    }
                    return response.blob();
                }),
                {
                    description: "PNG image",
                    extension: "png",
                    name: "cache-logo",
                }
            );
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
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
                render={
                    href ? (
                        <Link
                            className={logoClassName}
                            draggable={false}
                            href={href}
                            {...props}
                        />
                    ) : (
                        <div className={logoClassName} tabIndex={-1} />
                    )
                }
            >
                <Image
                    alt="App Icon"
                    className="block h-auto w-[180px] select-none"
                    draggable={false}
                    fetchPriority="high"
                    loading="eager"
                    sizes="180px"
                    src={src}
                />
            </ContextMenuTrigger>
            <ContextMenuPopup className="min-w-44">
                <ContextMenuItem onClick={handleSaveLogo}>
                    <DownloadIcon className="size-4 text-muted-foreground" />
                    Save logo as PNG
                </ContextMenuItem>
            </ContextMenuPopup>
        </ContextMenu>
    );
}
