"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import {
    ArchiveIcon,
    ArrowUpRight,
    ChevronRight,
    Clock,
    Component,
    CopyIcon,
    CopyPlus,
    EllipsisIcon,
    ExternalLinkIcon,
    FileSpreadsheetIcon,
    Forward,
    Info,
    LinkIcon,
    ListFilter,
    LockKeyhole,
    PencilIcon,
    Shapes,
    SignalHigh,
    SignalMedium,
    Sparkle,
    Trash2Icon,
    UserRoundPlus,
    X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsiblePanel,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Combobox,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxTrigger,
} from "@/components/ui/combobox";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/components/ui/dialog";
import { GradientWaveText } from "@/components/ui/gradient-wave-text";
import {
    ChevronDownFilledIcon,
    NotionIcon,
    PriorityNoneIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { CtrlKbd, Kbd } from "@/components/ui/kbd";
import {
    Menu,
    MenuGroup,
    MenuGroupLabel,
    MenuItem,
    MenuPopup,
    MenuSeparator,
    MenuShortcut,
    MenuSub,
    MenuSubPopup,
    MenuSubTrigger,
    MenuTrigger,
} from "@/components/ui/menu";
import {
    Popover,
    PopoverDescription,
    PopoverPopup,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    PreviewCard,
    PreviewCardPopup,
    PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { SidebarItem } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import type { LibraryCollectionSummary } from "@/lib/collections/utils";
import { cn } from "@/lib/common/cn";
import { getHexColorFromName } from "@/lib/common/colors";
import { dayjs } from "@/lib/dayjs";
import { getSourceLabel } from "@/lib/integrations/support";
import type { CollectionPriority } from "@/prisma/client/enums";
import AppIconSmall from "@/public/cache-icon-small.png";
import SmartCollectionsBackgroundImg from "@/public/smart-collections-background-wide.webp";

type CollectionSortField =
    | "count"
    | "created"
    | "priority"
    | "text-match"
    | "updated";

type CollectionOptionIcon = React.ComponentType<{ className?: string }>;

type CollectionsListStatusTone = "error" | "success";

type SortingComboboxOption =
    | SortingOption
    | {
          icon: CollectionOptionIcon;
          label: string;
          query: string;
          value: "text-match";
      };

interface CollectionFeedback {
    message: string;
    tone: CollectionsListStatusTone;
}

interface CollectionTemplateOption {
    description: string;
    name: string;
    value: string;
}

interface CollectionsListItemContextValue {
    collection: LibraryCollectionSummary;
    isHovered: boolean;
}

interface PriorityOption {
    icon: CollectionOptionIcon;
    label: string;
    value: CollectionPriority;
}

interface SortingOption {
    icon: CollectionOptionIcon;
    label: string;
    value: Exclude<CollectionSortField, "text-match">;
}

const PREVIEW_SLIDE_INTERVAL_MS = 600;

const NAME_MAX_LENGTH = 64;

const COMPACT_NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    notation: "compact",
});

const DEFAULT_PRIORITY: PriorityOption = {
    icon: PriorityNoneIcon,
    label: "No priority",
    value: "none",
};

const PRIORITIES = [
    DEFAULT_PRIORITY,
    {
        icon: Sparkle,
        label: "Very relevant",
        value: "very_relevant",
    },
    {
        icon: SignalHigh,
        label: "Relevant",
        value: "relevant",
    },
    {
        icon: SignalMedium,
        label: "Background",
        value: "peripheral",
    },
    {
        icon: ArchiveIcon,
        label: "Archive",
        value: "archive",
    },
] satisfies PriorityOption[];

const PRIORITY_BY_VALUE = new Map(
    PRIORITIES.map((option) => [option.value, option])
);

const SORT_OPTIONS = [
    {
        icon: SignalHigh,
        label: "Priority",
        value: "priority",
    },
    {
        icon: Sparkle,
        label: "Created",
        value: "created",
    },
    {
        icon: Clock,
        label: "Updated",
        value: "updated",
    },
    {
        icon: Component,
        label: "Count",
        value: "count",
    },
] satisfies SortingOption[];

const SORT_OPTION_BY_VALUE = new Map(
    SORT_OPTIONS.map((option) => [option.value, option])
);

const TEMPLATES = [
    {
        description:
            "Articles, essays, and references worth reading when you have time.",
        name: "Reading List",
        value: "reading_list",
    },
    {
        description:
            "Visual references, examples, and sparks to kick off new ideas.",
        name: "Inspiration",
        value: "inspiration",
    },
    {
        description:
            "Step-by-step tutorials, docs, and practical guides to revisit.",
        name: "Tutorials & Guides",
        value: "tutorials_guides",
    },
    {
        description:
            "APIs, standards, specs, and evergreen references you keep coming back to.",
        name: "Reference Shelf",
        value: "reference_shelf",
    },
    {
        description:
            "Apps, services, libraries, and useful tools worth keeping handy.",
        name: "Tools & Resources",
        value: "tools_resources",
    },
    {
        description: "Videos, talks, and media to watch when you're ready.",
        name: "Watch Later",
        value: "watch_later",
    },
    {
        description: "Recipes and meal ideas you want to try later.",
        name: "Recipes",
        value: "recipes",
    },
    {
        description:
            "Background research, references, and findings for ongoing work.",
        name: "Research Notes",
        value: "research_notes",
    },
    {
        description:
            "Potential product concepts, opportunities, and experiments.",
        name: "Product Ideas",
        value: "product_ideas",
    },
    {
        description:
            "Products, gear, and purchase links you're comparing or planning to buy.",
        name: "Things to Buy",
        value: "things_to_buy",
    },
    {
        description:
            "Restaurants, cafes, shops, and spots you want to check out soon.",
        name: "Places to Try",
        value: "places_to_try",
    },
    {
        description:
            "Trips, destinations, and travel resources to plan effectively.",
        name: "Travel Plans",
        value: "travel_plans",
    },
    {
        description:
            "DIY ideas, home upgrades, decor references, and projects for your space.",
        name: "Home Projects",
        value: "home_projects",
    },
    {
        description:
            "Workouts, routines, nutrition ideas, and wellness resources to revisit.",
        name: "Wellness & Fitness",
        value: "wellness_fitness",
    },
    {
        description:
            "Learning goals, resources, and opportunities for professional growth.",
        name: "Career Growth",
        value: "career_growth",
    },
    {
        description:
            "Tickets, events, deadlines, deals, and opportunities that are only useful for a short window and should be acted on soon.",
        name: "Time-sensitive",
        value: "time_sensitive",
    },
    {
        description:
            "Personal admin items like purchases, reminders, and household tasks.",
        name: "Life Admin",
        value: "life_admin",
    },
] as const satisfies readonly CollectionTemplateOption[];

type TemplateValue = (typeof TEMPLATES)[number]["value"];

const CollectionsListItemContext =
    React.createContext<CollectionsListItemContextValue | null>(null);

function useCollectionsListItemContext() {
    const context = React.use(CollectionsListItemContext);
    if (!context) {
        throw new Error(
            "CollectionsListItem compound components must be used within CollectionsListItem."
        );
    }
    return context;
}

function useCollectionItemHotkey(
    keys: Parameters<typeof useHotkeys>[0],
    onTrigger: () => void,
    enabled = true
) {
    const { isHovered } = useCollectionsListItemContext();
    const handleTrigger = useStableCallback(onTrigger);

    useHotkeys(
        keys,
        handleTrigger,
        {
            enabled: isHovered && enabled,
            preventDefault: true,
        },
        [enabled, handleTrigger, isHovered]
    );
}

function useCollectionItemPreviewIndex(
    isOpen: boolean,
    thumbnailCount: number
) {
    const [activePreviewIndex, setActivePreviewIndex] = React.useState(0);
    const hasMultipleThumbnails = thumbnailCount > 1;

    React.useEffect(() => {
        if (!(isOpen && hasMultipleThumbnails)) {
            setActivePreviewIndex(0);
            return;
        }

        const intervalId = setInterval(() => {
            setActivePreviewIndex(
                (currentIndex) => (currentIndex + 1) % thumbnailCount
            );
        }, PREVIEW_SLIDE_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [hasMultipleThumbnails, isOpen, thumbnailCount]);

    return activePreviewIndex;
}

function getPriorityOption(priority: CollectionPriority): PriorityOption {
    return PRIORITY_BY_VALUE.get(priority) ?? DEFAULT_PRIORITY;
}

function getItemStyle(name: string, isSelected: boolean): React.CSSProperties {
    const color = getHexColorFromName(name);
    const base = `color-mix(in srgb, ${color} ${isSelected ? 20 : 10}%, transparent)`;

    return {
        "--collection-background": isSelected
            ? `color-mix(in srgb, ${base}, white 3%)`
            : `color-mix(in srgb, ${base}, black 3%)`,
        "--focus-ring-color": `color-mix(in srgb, ${color}, black 50%)`,
        "--text-muted-color": `color-mix(in srgb, ${color} 16%, black 18%)`,
    } as React.CSSProperties;
}

function CollectionComboboxOptionRow({
    icon: Icon,
    label,
}: {
    icon: CollectionOptionIcon;
    label: string;
}) {
    return (
        <span className="flex min-w-0 items-center gap-2 text-foreground text-sm">
            <Icon className="size-4 text-muted-foreground" />
            <span className="truncate">{label}</span>
        </span>
    );
}

function CollectionsListPreviewImageFallback() {
    return (
        <div className="flex size-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
            No preview image
        </div>
    );
}

/**
 * Preview image that falls back when the source is missing or fails to load.
 */
function CollectionsListItemPreviewImage({
    alt,
    src,
}: {
    alt: string;
    src?: string;
}) {
    const [didFail, setDidFail] = React.useState(false);

    // biome-ignore lint/correctness/useExhaustiveDependencies: `src` is a prop; resetting error state when it changes is intentional.
    React.useEffect(() => {
        setDidFail(false);
    }, [src]);

    if (!src || didFail) {
        return <CollectionsListPreviewImageFallback />;
    }

    return (
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Fallback swaps in when the browser cannot render the image.
        <img
            alt={alt}
            className="size-full object-cover"
            height={192}
            loading="lazy"
            onError={() => setDidFail(true)}
            src={src}
            width={288}
        />
    );
}

function CollectionsListInlineRow({
    className,
    ...props
}: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-2 pr-0.5 pl-1",
                className
            )}
            {...props}
        />
    );
}

function CollectionsList({
    className,
    ...props
}: React.ComponentProps<typeof Collapsible>) {
    return <Collapsible className={cn("relative", className)} {...props} />;
}

interface CollectionsListTriggerProps
    extends React.ComponentProps<typeof CollapsibleTrigger> {
    collectionLabels: string[];
    isOpen: boolean;
}

/**
 * Button that toggles the collections list panel.
 *
 * Shows a tooltip with all collection labels on hover when collapsed.
 */
function CollectionsListTrigger({
    collectionLabels,
    isOpen,
    ...props
}: CollectionsListTriggerProps) {
    return (
        <Popover>
            <PopoverTrigger
                openOnHover
                render={
                    <CollapsibleTrigger
                        render={
                            <SidebarItem render={<button type="button" />} />
                        }
                        title={isOpen ? "Collapse group" : "Expand group"}
                        {...props}
                    />
                }
            />
            <PopoverPopup
                align="start"
                positionerClassname={cn(
                    isOpen && "pointer-events-none! hidden!"
                )}
                positionMethod="fixed"
                tooltipStyle
            >
                <p className="wrap-break-word w-full whitespace-normal font-medium leading-tight">
                    {collectionLabels.length > 0
                        ? collectionLabels.join(", ")
                        : "No collections yet"}
                </p>
            </PopoverPopup>
        </Popover>
    );
}

function CollectionsListPanel({
    className,
    ...props
}: React.ComponentProps<typeof CollapsiblePanel>) {
    return <CollapsiblePanel className={cn("pl-1", className)} {...props} />;
}

function CollectionsListToolbar({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Root>) {
    return (
        <Toolbar.Root
            className={cn(
                "flex w-full items-center justify-between",
                className
            )}
            {...props}
        />
    );
}

function CollectionsListToolbarGroup({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Group>) {
    return (
        <Toolbar.Group
            className={cn("flex items-center justify-end gap-1", className)}
            {...props}
        />
    );
}

function CollectionsListToolbarButton({
    className,
    ...props
}: React.ComponentProps<typeof Toolbar.Button>) {
    return (
        <Toolbar.Button
            className={cn("opacity-80 hover:opacity-100", className)}
            {...props}
        />
    );
}

function CollectionsListEmpty({
    className,
    ...props
}: React.ComponentProps<"p">) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/30 border-dashed px-4 py-7 text-center">
            <p
                className={cn(
                    "font-medium text-muted-foreground text-xs leading-tight",
                    className
                )}
                {...props}
            />
        </div>
    );
}

interface CollectionsListStatusProps extends React.ComponentProps<"p"> {
    onDismiss: () => void;
    tone?: CollectionsListStatusTone;
}

/**
 * Accessibility-friendly status message for collection operations.
 *
 * Returns `null` when there are no children so assistive technologies do not
 * announce silent updates.
 */
function CollectionsListStatus({
    className,
    onDismiss,
    tone = "success",
    ...props
}: CollectionsListStatusProps) {
    if (!props.children) {
        return null;
    }

    return (
        <CollectionsListInlineRow className="pt-1">
            <p
                aria-live="polite"
                className={cn(
                    "text-xs leading-tight",
                    tone === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    className
                )}
                role={tone === "error" ? "alert" : "status"}
                {...props}
            />
            <Button onClick={onDismiss} size="xs" variant="ghost">
                Dismiss
            </Button>
        </CollectionsListInlineRow>
    );
}

interface CollectionsListFilterClearProps
    extends React.ComponentProps<typeof Button> {
    isVisible: boolean;
}

function CollectionsListFilterClearButton({
    isVisible,
    ...props
}: CollectionsListFilterClearProps) {
    if (!isVisible) {
        return null;
    }

    return (
        <Button
            aria-label="Clear selected collections"
            size="icon-xs"
            variant="ghost"
            {...props}
        >
            <X
                aria-hidden
                className="inline-block size-3.5 shrink-0"
                focusable="false"
            />
        </Button>
    );
}

interface CollectionsListSortingComboboxProps
    extends Omit<React.ComponentProps<typeof ComboboxTrigger>, "value"> {
    inputValue: string;
    isOpen: boolean;
    onInputValueChange: (value: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onValueChange: (option: SortingComboboxOption | null) => void;
    value: SortingComboboxOption | null;
}

/**
 * Combobox for sorting collections or filtering by text match.
 *
 * Supports fixed sort fields and a dynamic text-match mode when the input
 * does not match any field label.
 */
function CollectionsListSortingCombobox({
    inputValue,
    isOpen,
    onInputValueChange,
    onOpenChange,
    onValueChange,
    value,
    ...props
}: CollectionsListSortingComboboxProps) {
    const trimmed = inputValue.trim();
    const normalized = trimmed.toLowerCase();
    const matching = SORT_OPTIONS.filter((option) =>
        option.label.toLowerCase().includes(normalized)
    );
    const isTextMatch = normalized.length > 0 && matching.length === 0;

    const options: SortingComboboxOption[] = isTextMatch
        ? [
              {
                  icon: ListFilter,
                  label: `Sort by "${trimmed}"`,
                  query: trimmed,
                  value: "text-match",
              },
          ]
        : matching;

    return (
        <Combobox<SortingComboboxOption>
            autoHighlight
            filter={null}
            inputValue={inputValue}
            items={options}
            itemToStringLabel={(option) =>
                option.value === "text-match"
                    ? option.query
                    : (SORT_OPTION_BY_VALUE.get(option.value)?.label ?? "")
            }
            itemToStringValue={(option) => option.value}
            onInputValueChange={onInputValueChange}
            onOpenChange={onOpenChange}
            onValueChange={onValueChange}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={<Button size="icon-xs" variant="ghost" />}
                title="Sort and organize collections"
                {...props}
            >
                <ListFilter
                    aria-hidden
                    className="inline-block size-3 shrink-0"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup align="end" positionMethod="fixed">
                <ComboboxInput
                    endAddon={
                        <Kbd>
                            <CtrlKbd />F
                        </Kbd>
                    }
                    placeholder="Sort by..."
                />
                <ComboboxEmpty>No matching sort options</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(sortOption: SortingComboboxOption) => (
                            <ComboboxItem
                                key={sortOption.value}
                                showIndicatorLast
                                value={sortOption}
                            >
                                <CollectionComboboxOptionRow
                                    icon={sortOption.icon}
                                    label={sortOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

/**
 * Callout that informs users when Smart Collections is active.
 */
function CollectionsListNoticeCallout({
    isDisabled,
    onDisable,
}: {
    isDisabled: boolean;
    onDisable: () => Promise<void>;
}) {
    return (
        <Popover>
            <span aria-live="polite" className="sr-only" role="status">
                {isDisabled
                    ? "Smart Collections"
                    : "Smart Collections is active"}
            </span>
            <PopoverTrigger
                className="group not-sr-only flex items-center text-nowrap font-medium text-[11px] opacity-70"
                openOnHover
            >
                <GradientWaveText
                    ariaLabel="Smart Collections"
                    className="w-fit underline decoration-muted-foreground/20 decoration-dotted underline-offset-2"
                    speed={2.2}
                >
                    Smart Collections
                </GradientWaveText>
                &nbsp;is active{" "}
                <ChevronDownFilledIcon className="mb-px size-4 rotate-90 group-data-popup-open:opacity-10!" />
            </PopoverTrigger>
            <PopoverPopup align="start" positionMethod="fixed">
                <Image
                    alt=""
                    aria-hidden
                    className="-mx-(--viewport-inline-padding) -mt-4 aspect-32/9 h-auto max-h-24 w-(--positioner-width) min-w-0 max-w-(--positioner-width) rounded-t-lg"
                    loading="eager"
                    priority
                    src={SmartCollectionsBackgroundImg}
                />
                <div className="mt-4 flex max-w-64 flex-col gap-2">
                    <PopoverTitle className="font-medium text-sm">
                        Let Cache do the organizing
                    </PopoverTitle>
                    <PopoverDescription className="text-foreground text-xs">
                        As you add new entries, Cache AI groups your related
                        saves into contextual collections intuitively. Cache
                        also learns your preferences with time.
                    </PopoverDescription>
                    <div className="ml-auto flex items-center justify-end gap-2">
                        <Button
                            render={<Link href="/activity" />}
                            size="xs"
                            variant="ghost"
                        >
                            Activity
                            <ArrowUpRight className="inline-block size-3.5 shrink-0 text-muted-foreground" />
                        </Button>
                        <Button
                            onClick={onDisable}
                            size="xs"
                            variant="destructive-outline"
                        >
                            Disable
                        </Button>
                    </div>
                </div>
            </PopoverPopup>
        </Popover>
    );
}

interface CollectionsListItemProps extends React.ComponentProps<"div"> {
    collection: LibraryCollectionSummary;
    isSelected: boolean;
}

/**
 * A single row in the collections list.
 *
 * Provides `CollectionsListItemContext` to its children so compound parts
 * can read the collection and hover state without prop drilling.
 */
function CollectionsListItem({
    className,
    collection,
    isSelected,
    onMouseEnter,
    onMouseLeave,
    style: styleProp,
    ...props
}: CollectionsListItemProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const style = getItemStyle(collection.name, isSelected);

    return (
        <CollectionsListItemContext value={{ collection, isHovered }}>
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Hover tracking scopes collection-level keyboard shortcuts. */}
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Same as above. */}
            <div
                {...props}
                className={cn(
                    "group relative flex select-none items-center",
                    className
                )}
                onMouseEnter={(event) => {
                    setIsHovered(true);
                    onMouseEnter?.(event);
                }}
                onMouseLeave={(event) => {
                    setIsHovered(false);
                    onMouseLeave?.(event);
                }}
                style={{ ...style, ...styleProp }}
            />
        </CollectionsListItemContext>
    );
}

interface CollectionsListItemPreviewProps
    extends React.ComponentProps<typeof PreviewCardTrigger> {
    thumbnails: readonly string[];
}

/**
 * Previewable trigger that cycles through collection thumbnails on hover.
 *
 * Clicking selects the collection and closes the preview popup.
 */
function CollectionsListItemPreview({
    onClick,
    thumbnails,
    ...props
}: CollectionsListItemPreviewProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const activePreviewIndex = useCollectionItemPreviewIndex(
        isOpen,
        thumbnails.length
    );

    return (
        <PreviewCard onOpenChange={setIsOpen} open={isOpen}>
            <PreviewCardTrigger
                closeDelay={0}
                onClick={(event) => {
                    onClick?.(event);
                    setIsOpen(false);
                }}
                render={
                    <SidebarItem
                        className="w-full min-w-0 flex-1 justify-start pr-8 pl-10 text-left hover:bg-transparent focus-visible:ring-(--focus-ring-color)"
                        render={<Button variant="ghost" />}
                    />
                }
                {...props}
            />
            <PreviewCardPopup
                className="pointer-events-none aspect-3/2 p-0"
                positionMethod="fixed"
                side="right"
            >
                <CollectionsListItemPreviewImage
                    alt={`${collection.name} preview`}
                    src={thumbnails[activePreviewIndex]}
                />
            </PreviewCardPopup>
        </PreviewCard>
    );
}

function CollectionsListItemValue() {
    const { collection } = useCollectionsListItemContext();

    return (
        <div className="flex min-w-0 flex-1 items-center gap-3 leading-none">
            <span
                className="max-w-full shrink-0 truncate font-medium text-sm"
                title={collection.description ?? undefined}
            >
                {collection.name}
            </span>
            {collection.sources.length > 0 && (
                <span className="max-w-full flex-1 truncate text-[11px] text-muted-foreground opacity-0 group-hover:opacity-80">
                    {collection.sources.map(getSourceLabel).join(", ")}
                </span>
            )}
        </div>
    );
}

interface CollectionsListItemPriorityComboboxProps {
    onValueChange: (priority: CollectionPriority) => void;
}

/**
 * Priority picker bound to the hovered collection item.
 *
 * The "P" hotkey opens the dropdown while the item is hovered.
 */
function CollectionsListItemPriorityCombobox({
    onValueChange,
}: CollectionsListItemPriorityComboboxProps) {
    const { collection } = useCollectionsListItemContext();
    const [isOpen, setIsOpen] = React.useState(false);
    const SelectedPriorityIcon = getPriorityOption(collection.priority).icon;

    useCollectionItemHotkey(
        "p",
        () => {
            setIsOpen(true);
        },
        !isOpen
    );

    return (
        <Combobox
            autoHighlight
            items={PRIORITIES}
            onOpenChange={setIsOpen}
            onValueChange={(nextPriority) => {
                if (!nextPriority || nextPriority === collection.priority) {
                    return;
                }
                onValueChange(nextPriority);
                setIsOpen(false);
            }}
            open={isOpen}
            value={collection.priority}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-label={`Change priority for ${collection.name}`}
                        className="absolute top-1/2 left-1.5 z-10 -translate-y-1/2 border-none bg-(--collection-background) text-(--focus-ring-color)"
                        size="icon-xs"
                        variant="ghost"
                    />
                }
            >
                <SelectedPriorityIcon className="size-4" />
            </ComboboxTrigger>
            <ComboboxPopup positionMethod="fixed">
                <ComboboxInput
                    endAddon={<Kbd>P</Kbd>}
                    placeholder={
                        collection.priority === "none"
                            ? "Set priority to..."
                            : "Change priority to..."
                    }
                />
                <ComboboxEmpty>No matching priorities</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(priorityOption: PriorityOption) => (
                            <ComboboxItem
                                key={priorityOption.value}
                                showIndicatorLast
                                value={priorityOption.value}
                            >
                                <CollectionComboboxOptionRow
                                    icon={priorityOption.icon}
                                    label={priorityOption.label}
                                />
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface CollectionsListSharePopoverProps {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    shareUrl: string | null;
}

function CollectionsListShareStatusCard({ isShared }: { isShared: boolean }) {
    return (
                    <div className="mt-4 rounded-xl border bg-muted/40 p-3">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-xs/5">
                                {isShared ? (
                                    <LinkIcon className="size-4" />
                                ) : (
                                    <LockKeyhole className="size-4" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">
                        {isShared ? "Anyone with the link" : "Only you"}
                                </p>
                                <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
                                    {isShared
                                        ? "Shared publicly as a read-only page."
                                        : "Create a short, unlisted read-only link for this collection."}
                                </p>
                            </div>
                        </div>
                    </div>
    );
}

function CollectionsListShareLinkControls({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    shareUrl,
}: {
    collection: LibraryCollectionSummary;
    isSharePending: boolean;
    onCopyShareLink: () => void;
    onDisableShare: () => void;
    shareUrl: string | null;
}) {
    const shareInputId = React.useId();

    return (
                        <div className="mt-4 space-y-3">
                            <div className="space-y-1">
                                <label
                                    className="font-medium text-muted-foreground text-xs"
                                    htmlFor={shareInputId}
                                >
                                    Public link
                                </label>
                                <Input
                                    id={shareInputId}
                                    readOnly
                                    size="sm"
                                    value={shareUrl ?? ""}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-muted-foreground text-xs">
                                    Shared{" "}
                                    {collection.sharedAt
                                        ? dayjs(collection.sharedAt).fromNow()
                                        : "just now"}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        loading={isSharePending}
                                        onClick={onDisableShare}
                                        size="sm"
                                        variant="ghost"
                                    >
                                        Disable
                                    </Button>
                                    <Button
                                        disabled={!shareUrl || isSharePending}
                                        onClick={onCopyShareLink}
                                        size="sm"
                                    >
                                        <CopyIcon className="size-4" />
                                        Copy link
                                    </Button>
                                </div>
                            </div>
                        </div>
    );
}

function CollectionsListShareEnableAction({
    isSharePending,
    onEnableShare,
}: {
    isSharePending: boolean;
    onEnableShare: () => void;
}) {
    return (
                        <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-muted-foreground leading-tight">
                Public links stay simple and read-only so your collection can be
                browsed without signing in.
                            </p>
                            <Button
                                autoFocus
                                loading={isSharePending}
                                onClick={onEnableShare}
                                size="sm"
                            >
                                Create link
                            </Button>
                        </div>
    );
}

/**
 * Sub-menu for enabling, disabling, or copying a public share link.
 */
function CollectionsListSharePopover({
    collection,
    isSharePending,
    onCopyShareLink,
    onDisableShare,
    onEnableShare,
    shareUrl,
}: CollectionsListSharePopoverProps) {
    const isShared = Boolean(collection.shareId);

    return (
        <MenuSub>
            <MenuSubTrigger>
                <UserRoundPlus className="size-4 text-muted-foreground" />
                Share
            </MenuSubTrigger>
            <MenuSubPopup>
                <div className="max-w-xs p-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <h3 className="font-medium text-sm">
                                Share collection
                            </h3>
                            <p className="text-muted-foreground text-xs leading-snug">
                                Anyone with the link can view this collection.
                            </p>
                        </div>
                    </div>
                    <CollectionsListShareStatusCard isShared={isShared} />
                    {isShared ? (
                        <CollectionsListShareLinkControls
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            shareUrl={shareUrl}
                        />
                    ) : (
                        <CollectionsListShareEnableAction
                            isSharePending={isSharePending}
                            onEnableShare={onEnableShare}
                        />
                    )}
                </div>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionsListExportMenuProps {
    hasItems: boolean;
    onCopyLinks: () => void;
    onCopyTitle: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
}

/**
 * Sub-menu with export and duplication actions for a collection.
 *
 * Some items are disabled when the collection has no entries.
 */
function CollectionsListExportMenu({
    hasItems,
    onCopyLinks,
    onCopyTitle,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
}: CollectionsListExportMenuProps) {
    return (
        <MenuSub>
            <MenuSubTrigger>
                <Forward className="inline-block size-4 text-muted-foreground" />
                Export
            </MenuSubTrigger>
            <MenuSubPopup>
                <MenuItem onClick={onCopyTitle}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy title
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onCopyLinks}>
                    <CopyIcon className="size-4 text-muted-foreground" />
                    Copy all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onOpenLinks}>
                    <ExternalLinkIcon className="size-4 text-muted-foreground" />
                    Open all links
                </MenuItem>
                <MenuItem disabled={!hasItems} onClick={onExportCsv}>
                    <FileSpreadsheetIcon className="size-4 text-muted-foreground" />
                    Export to CSV
                </MenuItem>
                <MenuItem onClick={onMakeCopy}>
                    <CopyPlus className="size-4 text-muted-foreground" />
                    Make a copy
                </MenuItem>
                <MenuItem disabled={!hasItems}>
                    <NotionIcon />
                    Send to Notion
                </MenuItem>
            </MenuSubPopup>
        </MenuSub>
    );
}

interface CollectionsListItemMetaProps {
    isSharePending: boolean;
    onCopyLinks: () => void;
    onCopyShareLink: () => void;
    onCopyTitle: () => void;
    onDelete: () => void;
    onDisableShare: () => void;
    onEnableShare: () => void;
    onExportCsv: () => void;
    onMakeCopy: () => void;
    onOpenLinks: () => void;
    onRename: () => void;
    shareUrl: string | null;
}

/**
 * Action menu and metadata for a collection list item.
 *
 * Renders a count badge that hides on hover, replacing it with an ellipsis
 * menu. Keyboard shortcuts (E, Delete/Backspace, C) are active while hovered.
 */
function CollectionsListItemMeta({
    isSharePending,
    onCopyLinks,
    onCopyShareLink,
    onCopyTitle,
    onDelete,
    onDisableShare,
    onEnableShare,
    onExportCsv,
    onMakeCopy,
    onOpenLinks,
    onRename,
    shareUrl,
}: CollectionsListItemMetaProps) {
    const { collection } = useCollectionsListItemContext();
    const hasItems = collection.itemCount > 0;

    useCollectionItemHotkey("e", onRename);
    useCollectionItemHotkey(["delete", "backspace"], onDelete);
    useCollectionItemHotkey("c", onCopyLinks, hasItems);

    return (
        <div className="absolute top-1/2 right-0 flex size-8 -translate-y-1/2 items-center justify-center">
            <span className="pointer-events-none text-nowrap text-(--text-muted-color) text-xs tabular-nums focus-visible:opacity-0 group-focus-within:opacity-0 group-hover:opacity-0">
                {COMPACT_NUMBER_FORMATTER.format(collection.itemCount)}
            </span>
            <Menu>
                <MenuTrigger
                    render={
                        <Button
                            className="absolute opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 group-focus:opacity-100"
                            size="icon-xs"
                            title={`Collection actions for ${collection.name}`}
                            variant="ghost"
                        />
                    }
                >
                    <EllipsisIcon
                        aria-hidden
                        className="inline-block size-3.5 shrink-0"
                        focusable="false"
                    />
                </MenuTrigger>
                <MenuPopup align="start" side="right">
                    <MenuGroup>
                        <MenuGroupLabel>Collection</MenuGroupLabel>
                        <MenuItem onClick={onRename}>
                            <PencilIcon className="size-4 text-muted-foreground" />
                            Rename
                            <MenuShortcut>E</MenuShortcut>
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <CollectionsListSharePopover
                            collection={collection}
                            isSharePending={isSharePending}
                            onCopyShareLink={onCopyShareLink}
                            onDisableShare={onDisableShare}
                            onEnableShare={onEnableShare}
                            shareUrl={shareUrl}
                        />
                        <CollectionsListExportMenu
                            hasItems={hasItems}
                            onCopyLinks={onCopyLinks}
                            onCopyTitle={onCopyTitle}
                            onExportCsv={onExportCsv}
                            onMakeCopy={onMakeCopy}
                            onOpenLinks={onOpenLinks}
                        />
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuGroup>
                        <MenuItem onClick={onDelete} variant="destructive">
                            <Trash2Icon className="size-4" />
                            Delete
                        </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <p className="text-nowrap p-2 pb-0 text-[10px] text-muted-foreground leading-none">
                        Last updated {dayjs(collection.updatedAt).fromNow()}
                    </p>
                    <p className="text-nowrap p-2 pt-1 text-[10px] text-muted-foreground leading-none">
                        {dayjs(collection.updatedAt).format(
                            "MMM DD, YYYY, h:mm A"
                        )}
                    </p>
                </MenuPopup>
            </Menu>
        </div>
    );
}

interface RenameDialogProps {
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

/**
 * Dialog for renaming an existing collection.
 */
function RenameDialog({
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: RenameDialogProps) {
    const inputId = React.useId();

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Rename collection</DialogTitle>
                        <DialogDescription>
                            Update how this collection appears across your
                            library.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogPanel>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={inputId}
                            >
                                Name
                            </label>
                            <Input
                                autoFocus
                                id={inputId}
                                maxLength={NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
                                required
                                type="text"
                                value={nameDraft}
                            />
                            {errorMessage ? (
                                <p className="pt-2 text-destructive text-xs">
                                    {errorMessage}
                                </p>
                            ) : null}
                        </div>
                    </DialogPanel>
                    <DialogFooter>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface CreateDialogProps {
    descriptionDraft: string;
    errorMessage: string | null;
    isOpen: boolean;
    isPending: boolean;
    nameDraft: string;
    onCreateFromTemplate: (templateValue: TemplateValue | null) => void;
    onDescriptionDraftChange: (draft: string) => void;
    onNameDraftChange: (draft: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: () => void;
}

/**
 * Dialog for creating a new collection with an optional template picker.
 */
function CreateDialog({
    descriptionDraft,
    errorMessage,
    isOpen,
    isPending,
    nameDraft,
    onCreateFromTemplate,
    onDescriptionDraftChange,
    onNameDraftChange,
    onOpenChange,
    onSubmit,
}: CreateDialogProps) {
    const nameInputId = React.useId();
    const descriptionInputId = React.useId();

    return (
        <Dialog onOpenChange={onOpenChange} open={isOpen}>
            <DialogPopup>
                <form
                    className="contents"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit();
                    }}
                >
                    <DialogHeader>
                        <div className="flex items-center gap-1">
                            <Badge size="lg" variant="outline">
                                <Image
                                    alt=""
                                    height={12}
                                    src={AppIconSmall}
                                    width={12}
                                />
                                Cache
                            </Badge>
                            <ChevronRight className="inline-block size-3.5 shrink-0" />
                            <DialogTitle className="font-medium text-sm">
                                New collection
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogPanel className="space-y-2">
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={nameInputId}
                            >
                                Name
                            </label>
                            <Input
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={nameInputId}
                                maxLength={NAME_MAX_LENGTH}
                                onChange={(event) =>
                                    onNameDraftChange(event.currentTarget.value)
                                }
                                placeholder="Collection title"
                                required
                                size="lg"
                                type="text"
                                unstyled
                                value={nameDraft}
                            />
                        </div>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={descriptionInputId}
                            >
                                Description (optional)
                            </label>
                            <Textarea
                                className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                id={descriptionInputId}
                                maxLength={1024}
                                onChange={(event) =>
                                    onDescriptionDraftChange(
                                        event.currentTarget.value
                                    )
                                }
                                placeholder="Add description..."
                                size="lg"
                                unstyled
                                value={descriptionDraft}
                            />
                        </div>
                        {errorMessage ? (
                            <p className="text-destructive text-xs">
                                {errorMessage}
                            </p>
                        ) : null}
                    </DialogPanel>
                    <DialogFooter>
                        <Combobox
                            autoHighlight
                            items={TEMPLATES}
                            onValueChange={onCreateFromTemplate}
                        >
                            <ComboboxTrigger
                                disabled={isPending}
                                render={
                                    <Button
                                        className="mr-auto -ml-2"
                                        size="xs"
                                        variant="link"
                                    />
                                }
                            >
                                <Shapes className="mr-0.5! size-4" />
                                Explore Templates
                            </ComboboxTrigger>
                            <ComboboxPopup align="start" className="max-w-80">
                                <ComboboxInput placeholder="Create collection from template..." />
                                <ComboboxEmpty>
                                    No matching templates
                                </ComboboxEmpty>
                                <ComboboxList>
                                    <ComboboxCollection>
                                        {(template) => (
                                            <ComboboxItem
                                                key={template.value}
                                                value={template.value}
                                            >
                                                <div className="flex min-w-0 max-w-80 flex-col gap-0.5">
                                                    <span className="min-w-0 truncate text-foreground text-sm">
                                                        {template.name}
                                                    </span>
                                                    <span className="line-clamp-2 text-muted-foreground text-xs">
                                                        {template.description}
                                                    </span>
                                                </div>
                                            </ComboboxItem>
                                        )}
                                    </ComboboxCollection>
                                </ComboboxList>
                                <div className="flex gap-2 px-3 py-2">
                                    <Info className="inline-block size-3.5 shrink-0" />
                                    <p className="text-[11px] text-muted-foreground leading-tight">
                                        Cache's{" "}
                                        <strong className="font-medium">
                                            Smart Collections&nbsp;
                                            <Sparkle className="mb-px inline-block size-3" />
                                        </strong>{" "}
                                        can automatically assign collections to
                                        entries that match with these.
                                    </p>
                                </div>
                            </ComboboxPopup>
                        </Combobox>
                        <DialogClose
                            disabled={isPending}
                            render={<Button size="sm" variant="ghost" />}
                        >
                            Cancel
                        </DialogClose>
                        <Button loading={isPending} size="sm" type="submit">
                            Create collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface DeleteDialogProps {
    collection: LibraryCollectionSummary | null;
    isPending: boolean;
    onConfirm: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

/**
 * Confirmation dialog for deleting a collection.
 */
function DeleteDialog({
    collection,
    isPending,
    onConfirm,
    onOpenChange,
}: DeleteDialogProps) {
    return (
        <Dialog onOpenChange={onOpenChange} open={collection !== null}>
            <DialogPopup>
                <DialogHeader>
                    <DialogTitle>Delete collection?</DialogTitle>
                    <DialogDescription>
                        Remove {collection?.name || "this collection"} from
                        Cache. Saved items will remain in your library, but they
                        won't belong to this collection anymore.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose
                        disabled={isPending}
                        render={<Button variant="ghost" />}
                    >
                        Cancel
                    </DialogClose>
                    <Button
                        loading={isPending}
                        onClick={onConfirm}
                        variant="destructive"
                    >
                        Delete
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}

export {
    CollectionsList,
    CollectionsListEmpty,
    CollectionsListFilterClearButton,
    CollectionsListInlineRow,
    CollectionsListItem,
    CollectionsListItemMeta,
    CollectionsListItemPreview,
    CollectionsListItemPriorityCombobox,
    CollectionsListItemValue,
    CollectionsListNoticeCallout,
    CollectionsListPanel,
    CollectionsListSharePopover,
    CollectionsListSortingCombobox,
    CollectionsListStatus,
    CollectionsListToolbar,
    CollectionsListToolbarButton,
    CollectionsListToolbarGroup,
    CollectionsListTrigger,
    CreateDialog,
    DeleteDialog,
    RenameDialog,
    SORT_OPTION_BY_VALUE,
    TEMPLATES,
    type CollectionFeedback,
    type CollectionsListItemContextValue,
    type CollectionsListItemMetaProps,
    type CollectionsListItemPreviewProps,
    type CollectionsListItemProps,
    type CollectionsListSharePopoverProps,
    type CollectionsListSortingComboboxProps,
    type CollectionsListStatusProps,
    type CollectionsListTriggerProps,
    type CollectionSortField,
    type CreateDialogProps,
    type DeleteDialogProps,
    type PriorityOption,
    type RenameDialogProps,
    type SortingComboboxOption,
    type TemplateValue,
};
