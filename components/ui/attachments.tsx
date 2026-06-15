"use client";

import { Button } from "@/components/ui/button";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { cn } from "@/lib/common/cn";
import type { FileUIPart, SourceDocumentUIPart } from "ai";
import {
    FileTextIcon,
    GlobeIcon,
    ImageIcon,
    Music2Icon,
    PaperclipIcon,
    VideoIcon,
    XIcon,
} from "lucide-react";
import * as React from "react";

type AttachmentData =
    | (FileUIPart & { id: string })
    | (SourceDocumentUIPart & { id: string });

type AttachmentMediaCategory =
    | "image"
    | "video"
    | "audio"
    | "document"
    | "source"
    | "unknown";

type AttachmentVariant = "grid" | "inline" | "list";

const MEDIA_CATEGORY_ICON_BY_CATEGORY: Record<
    AttachmentMediaCategory,
    typeof ImageIcon
> = {
    audio: Music2Icon,
    document: FileTextIcon,
    image: ImageIcon,
    source: GlobeIcon,
    unknown: PaperclipIcon,
    video: VideoIcon,
};

export function getMediaCategory(
    data: AttachmentData
): AttachmentMediaCategory {
    if (data.type === "source-document") {
        return "source";
    }

    const mediaType = data.mediaType ?? "";

    if (mediaType.startsWith("image/")) {
        return "image";
    }
    if (mediaType.startsWith("video/")) {
        return "video";
    }
    if (mediaType.startsWith("audio/")) {
        return "audio";
    }
    if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) {
        return "document";
    }

    return "unknown";
}

export function getAttachmentLabel(data: AttachmentData): string {
    if (data.type === "source-document") {
        return data.title || data.filename || "Source";
    }

    const category = getMediaCategory(data);
    return data.filename || (category === "image" ? "Image" : "Attachment");
}

function renderAttachmentImage(
    url: string,
    filename: string | undefined,
    isGrid: boolean
) {
    return (
        <img
            alt={filename || "Image"}
            className={cn("size-full object-cover", !isGrid && "rounded")}
            height={isGrid ? 96 : 20}
            src={url}
            width={isGrid ? 96 : 20}
        />
    );
}

function renderAttachmentIcon(Icon: typeof ImageIcon, iconClassName: string) {
    return <Icon className={cn(iconClassName, "text-muted-foreground")} />;
}

function renderAttachmentPreviewContent(
    data: AttachmentData,
    mediaCategory: AttachmentMediaCategory,
    variant: AttachmentVariant,
    fallbackIcon: React.ReactNode
) {
    if (mediaCategory === "image" && data.type === "file" && data.url) {
        return renderAttachmentImage(
            data.url,
            data.filename,
            variant === "grid"
        );
    }

    if (mediaCategory === "video" && data.type === "file" && data.url) {
        return (
            <video className="size-full object-cover" muted src={data.url} />
        );
    }

    const Icon = MEDIA_CATEGORY_ICON_BY_CATEGORY[mediaCategory];
    const iconClassName = variant === "inline" ? "size-3" : "size-4";
    return fallbackIcon ?? renderAttachmentIcon(Icon, iconClassName);
}

interface AttachmentsContextValue {
    variant: AttachmentVariant;
}

const DEFAULT_ATTACHMENTS_CONTEXT = {
    variant: "grid",
} satisfies AttachmentsContextValue;

const AttachmentsContext = React.createContext<AttachmentsContextValue | null>(
    null
);

interface AttachmentContextValue {
    data: AttachmentData;
    mediaCategory: AttachmentMediaCategory;
    onRemove?: () => void;
    variant: AttachmentVariant;
}

const AttachmentContext = React.createContext<AttachmentContextValue | null>(
    null
);

function useAttachmentsContext() {
    return React.use(AttachmentsContext) ?? DEFAULT_ATTACHMENTS_CONTEXT;
}

function useAttachmentContext() {
    const context = React.use(AttachmentContext);
    if (!context) {
        throw new Error(
            "Attachment components must be used within <Attachment>"
        );
    }
    return context;
}

interface AttachmentsProps extends React.ComponentProps<"div"> {
    variant?: AttachmentVariant;
}

export function Attachments({
    variant = "grid",
    className,
    ...props
}: AttachmentsProps) {
    return (
        <AttachmentsContext value={{ variant }}>
            <div
                {...props}
                className={cn(
                    "flex items-start",
                    variant === "list" ? "flex-col gap-2" : "flex-wrap gap-2",
                    variant === "grid" && "ml-auto w-fit",
                    className
                )}
            />
        </AttachmentsContext>
    );
}

interface AttachmentProps extends React.ComponentProps<"div"> {
    data: AttachmentData;
    onRemove?: () => void;
}

export function Attachment({
    data,
    onRemove,
    className,
    ...props
}: AttachmentProps) {
    const { variant } = useAttachmentsContext();
    const mediaCategory = getMediaCategory(data);

    return (
        <AttachmentContext value={{ data, mediaCategory, onRemove, variant }}>
            <div
                {...props}
                className={cn(
                    "group relative",
                    variant === "grid" && "size-24 overflow-hidden rounded-lg",
                    variant === "inline" && [
                        "flex h-8 cursor-pointer select-none items-center gap-1",
                        "rounded-md border border-border px-1.5",
                        "font-medium text-sm transition-all",
                        "hover:bg-accent hover:text-accent-foreground",
                    ],
                    variant === "list" && [
                        "flex w-full items-center gap-3 rounded-lg border p-3",
                        "hover:bg-accent/50",
                    ],
                    className
                )}
            />
        </AttachmentContext>
    );
}

interface AttachmentPreviewProps extends React.ComponentProps<"div"> {
    fallbackIcon?: React.ReactNode;
}

export function AttachmentPreview({
    fallbackIcon,
    className,
    ...props
}: AttachmentPreviewProps) {
    const { data, mediaCategory, variant } = useAttachmentContext();

    return (
        <div
            {...props}
            className={cn(
                "flex shrink-0 items-center justify-center overflow-hidden",
                variant === "grid" && "size-full bg-muted",
                variant === "inline" && "size-5 rounded bg-background",
                variant === "list" && "size-12 rounded bg-muted",
                className
            )}
        >
            {renderAttachmentPreviewContent(
                data,
                mediaCategory,
                variant,
                fallbackIcon
            )}
        </div>
    );
}

interface AttachmentInfoProps extends React.ComponentProps<"div"> {
    showMediaType?: boolean;
}

export function AttachmentInfo({
    showMediaType = false,
    className,
    ...props
}: AttachmentInfoProps) {
    const { data, variant } = useAttachmentContext();
    const label = getAttachmentLabel(data);

    if (variant === "grid") {
        return null;
    }

    return (
        <div {...props} className={cn("min-w-0 flex-1", className)}>
            <span className="block truncate">{label}</span>
            {showMediaType && data.mediaType ? (
                <span className="block truncate text-muted-foreground text-xs">
                    {data.mediaType}
                </span>
            ) : null}
        </div>
    );
}

interface AttachmentRemoveProps extends React.ComponentProps<typeof Button> {
    label?: string;
}

export function AttachmentRemove({
    label = "Remove",
    className,
    children,
    ...props
}: AttachmentRemoveProps) {
    const { onRemove, variant } = useAttachmentContext();

    if (!onRemove) {
        return null;
    }

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        onRemove();
    };

    return (
        <Button
            aria-label={label}
            className={cn(
                variant === "grid" && [
                    "absolute top-2 right-2 size-6 rounded-full p-0",
                    "bg-background/80 backdrop-blur-sm",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    "hover:bg-background",
                    "[&>svg]:size-3",
                ],
                variant === "inline" && [
                    "size-5 rounded p-0",
                    "opacity-0 transition-opacity group-hover:opacity-100",
                    "[&>svg]:size-2.5",
                ],
                variant === "list" && [
                    "size-8 shrink-0 rounded p-0",
                    "[&>svg]:size-4",
                ],
                className
            )}
            onClick={handleClick}
            variant="ghost"
            {...props}
        >
            {children ?? <XIcon />}
            <span className="sr-only">{label}</span>
        </Button>
    );
}

export const AttachmentPreviewCard: typeof PreviewCard = PreviewCard;

export const AttachmentPreviewCardTrigger: typeof PreviewCardTrigger =
    PreviewCardTrigger;

export function AttachmentPreviewCardPopup({
    align = "start",
    className,
    ...props
}: React.ComponentProps<typeof PreviewCardPopup>) {
    return (
        <PreviewCardPopup
            align={align}
            className={cn("w-auto p-2", className)}
            {...props}
        />
    );
}
