"use client";

import { cn } from "@/lib/common/cn";
import {
    ContextMenu,
    ContextMenuItem,
    ContextMenuPopup,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { saveFile } from "@/lib/common/file";
import { DownloadIcon } from "lucide-react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import Link from "next/link";
import type * as React from "react";

interface BrandLogoProps
    extends Omit<React.ComponentProps<typeof Link>, "href"> {
    href?: string;
    src: StaticImageData;
}

export function BrandLogo({ href, src, className, ...props }: BrandLogoProps) {
    const handleSaveLogo = async () => {
        try {
            await saveFile(
                fetch(src.src).then((response) => {
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
            console.error("Failed to save logo image", error);
        }
    };

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
                    priority
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
