"use client";

import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { cn } from "@/lib/common/cn";
import {
    type Announcements,
    closestCenter,
    closestCorners,
    type CollisionDetection,
    defaultDropAnimationSideEffects,
    DndContext,
    type DndContextProps,
    type DragCancelEvent,
    type DragEndEvent,
    type DraggableAttributes,
    type DraggableSyntheticListeners,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    type DropAnimation,
    type DroppableContainer,
    getFirstCollision,
    KeyboardCode,
    type KeyboardCoordinateGetter,
    KeyboardSensor,
    MeasuringStrategy,
    MouseSensor,
    pointerWithin,
    rectIntersection,
    TouchSensor,
    type UniqueIdentifier,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    type AnimateLayoutChanges,
    arrayMove,
    defaultAnimateLayoutChanges,
    horizontalListSortingStrategy,
    SortableContext,
    type SortableContextProps,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS, type Transform } from "@dnd-kit/utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";

const directions: string[] = [
    KeyboardCode.Down,
    KeyboardCode.Right,
    KeyboardCode.Up,
    KeyboardCode.Left,
];

const coordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
    const { active, droppableRects, droppableContainers, collisionRect } =
        context;

    if (directions.includes(event.code)) {
        event.preventDefault();

        if (!(active && collisionRect)) {
            return;
        }

        const filteredContainers: DroppableContainer[] = [];

        for (const entry of droppableContainers.getEnabled()) {
            if (!entry || entry?.disabled) {
                return;
            }

            const rect = droppableRects.get(entry.id);

            if (!rect) {
                return;
            }

            const data = entry.data.current;

            if (data) {
                const { type, children } = data;

                if (
                    type === "container" &&
                    children?.length > 0 &&
                    active.data.current?.type !== "container"
                ) {
                    return;
                }
            }

            switch (event.code) {
                case KeyboardCode.Down:
                    if (collisionRect.top < rect.top) {
                        filteredContainers.push(entry);
                    }
                    break;
                case KeyboardCode.Up:
                    if (collisionRect.top > rect.top) {
                        filteredContainers.push(entry);
                    }
                    break;
                case KeyboardCode.Left:
                    if (collisionRect.left >= rect.left + rect.width) {
                        filteredContainers.push(entry);
                    }
                    break;
                case KeyboardCode.Right:
                    if (collisionRect.left + collisionRect.width <= rect.left) {
                        filteredContainers.push(entry);
                    }
                    break;
                default:
                    return;
            }
        }

        const collisions = closestCorners({
            active,
            collisionRect,
            droppableContainers: filteredContainers,
            droppableRects,
            pointerCoordinates: null,
        });
        const closestId = getFirstCollision(collisions, "id");

        if (closestId != null) {
            const newDroppable = droppableContainers.get(closestId);
            const newNode = newDroppable?.node.current;
            const newRect = newDroppable?.rect.current;

            if (newNode && newRect) {
                if (newDroppable.id === "placeholder") {
                    return {
                        x:
                            newRect.left +
                            (newRect.width - collisionRect.width) / 2,
                        y:
                            newRect.top +
                            (newRect.height - collisionRect.height) / 2,
                    };
                }

                if (newDroppable.data.current?.type === "container") {
                    return {
                        x: newRect.left + 20,
                        y: newRect.top + 74,
                    };
                }

                return {
                    x: newRect.left,
                    y: newRect.top,
                };
            }
        }
    }

    return;
};

const ROOT_NAME = "Kanban";
const BOARD_NAME = "KanbanBoard";
const COLUMN_NAME = "KanbanColumn";
const COLUMN_HANDLE_NAME = "KanbanColumnHandle";
const ITEM_NAME = "KanbanItem";
const ITEM_HANDLE_NAME = "KanbanItemHandle";
const OVERLAY_NAME = "KanbanOverlay";

interface KanbanContextValue<T> {
    activeId: UniqueIdentifier | null;
    flatCursor: boolean;
    getItemValue: (item: T) => UniqueIdentifier;
    id: string;
    items: Record<UniqueIdentifier, T[]>;
    modifiers: DndContextProps["modifiers"];
    orientation: "horizontal" | "vertical";
    setActiveId: (id: UniqueIdentifier | null) => void;
    strategy: SortableContextProps["strategy"];
}

const KanbanContext = React.createContext<KanbanContextValue<unknown> | null>(
    null
);

function useKanbanContext(consumerName: string) {
    const context = React.useContext(KanbanContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ROOT_NAME}\``
        );
    }
    return context;
}

interface GetItemValue<T> {
    /**
     * Callback that returns a unique identifier for each kanban item. Required for array of objects.
     * @example getItemValue={(item) => item.id}
     */
    getItemValue: (item: T) => UniqueIdentifier;
}

type KanbanProps<T> = Omit<DndContextProps, "collisionDetection"> &
    (T extends object ? GetItemValue<T> : Partial<GetItemValue<T>>) & {
        value: Record<UniqueIdentifier, T[]>;
        onValueChange?: (columns: Record<UniqueIdentifier, T[]>) => void;
        onMove?: (
            event: DragEndEvent & { activeIndex: number; overIndex: number }
        ) => void;
        strategy?: SortableContextProps["strategy"];
        orientation?: "horizontal" | "vertical";
        flatCursor?: boolean;
    };

function getColumnIds<T>(items: Record<UniqueIdentifier, T[]>) {
    return Object.keys(items);
}

function getColumnIndex<T>(
    items: Record<UniqueIdentifier, T[]>,
    id: UniqueIdentifier
) {
    return getColumnIds(items).indexOf(String(id));
}

function getItemIndex<T>(
    items: T[],
    id: UniqueIdentifier,
    getItemValue: (item: T) => UniqueIdentifier
) {
    return items.findIndex((item) => getItemValue(item) === id);
}

function getDragAnnouncementPosition<T>({
    id,
    isColumn,
    items,
    getColumn,
    getItemValue,
}: {
    id: UniqueIdentifier;
    isColumn: boolean;
    items: Record<UniqueIdentifier, T[]>;
    getColumn: (id: UniqueIdentifier) => UniqueIdentifier | null;
    getItemValue: (item: T) => UniqueIdentifier;
}) {
    if (isColumn) {
        return getColumnIndex(items, id) + 1;
    }

    const column = getColumn(id);
    if (!(column && items[column])) {
        return 1;
    }

    return getItemIndex(items[column], id, getItemValue) + 1;
}

function getDragAnnouncementTotal<T>({
    id,
    isColumn,
    items,
    getColumn,
}: {
    id: UniqueIdentifier;
    isColumn: boolean;
    items: Record<UniqueIdentifier, T[]>;
    getColumn: (id: UniqueIdentifier) => UniqueIdentifier | null;
}) {
    if (isColumn) {
        return getColumnIds(items).length;
    }

    const column = getColumn(id);
    return column ? (items[column]?.length ?? 0) : 0;
}

function getDragAnnouncement<T>({
    activeId,
    overId,
    action,
    items,
    getColumn,
    getItemValue,
}: {
    activeId: UniqueIdentifier;
    overId: UniqueIdentifier;
    action: "dropped" | "moved";
    items: Record<UniqueIdentifier, T[]>;
    getColumn: (id: UniqueIdentifier) => UniqueIdentifier | null;
    getItemValue: (item: T) => UniqueIdentifier;
}) {
    const isColumn = activeId in items;
    const itemType = isColumn ? "column" : "item";
    const position = getDragAnnouncementPosition({
        getColumn,
        getItemValue,
        id: overId,
        isColumn,
        items,
    });
    const total = getDragAnnouncementTotal({
        getColumn,
        id: overId,
        isColumn,
        items,
    });

    if (isColumn) {
        return `${itemType} ${action === "dropped" ? "was dropped" : "is now"} at position ${position} of ${total}`;
    }

    const overColumn = getColumn(overId);
    const activeColumn = getColumn(activeId);
    if (activeColumn !== overColumn) {
        return `${itemType} ${action === "dropped" ? "was dropped" : "is now"} at position ${position} of ${total} in ${overColumn}`;
    }

    return `${itemType} ${action === "dropped" ? "was dropped" : "is now"} at position ${position} of ${total}`;
}

function assertNonEmptyValue(value: UniqueIdentifier, name: string) {
    if (value === "") {
        throw new Error(`\`${name}\` value cannot be an empty string`);
    }
}

interface KanbanSortableResult<T extends HTMLElement> {
    attributes: DraggableAttributes;
    composedRef: React.RefCallback<T> | null;
    composedStyle: React.CSSProperties;
    isDragging: boolean;
    listeners: DraggableSyntheticListeners | undefined;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    setNodeRef: (node: HTMLElement | null) => void;
    transform: Transform | null;
    transition: string | undefined;
}

function useKanbanSortable<T extends HTMLElement>(
    value: UniqueIdentifier,
    disabled: boolean | undefined,
    ref: React.Ref<T> | undefined,
    style?: React.CSSProperties,
    options?: { animateLayoutChanges?: AnimateLayoutChanges }
): KanbanSortableResult<T> {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        animateLayoutChanges: options?.animateLayoutChanges,
        disabled,
        id: value,
    });

    const composedRef = useMergedRefs(ref, (node) => {
        if (disabled) {
            return;
        }
        setNodeRef(node);
    });

    const composedStyle: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...style,
    };

    return {
        attributes,
        composedRef,
        composedStyle,
        isDragging,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
    };
}

function Kanban<T>(props: KanbanProps<T>) {
    const {
        value,
        onValueChange,
        modifiers,
        strategy = verticalListSortingStrategy,
        orientation = "horizontal",
        onMove,
        getItemValue: getItemValueProp,
        accessibility,
        flatCursor = false,
        ...kanbanProps
    } = props;

    const id = React.useId();
    const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(
        null
    );
    const lastOverIdRef = React.useRef<UniqueIdentifier | null>(null);
    const hasMovedRef = React.useRef(false);
    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter,
        })
    );

    function getItemValue(item: T): UniqueIdentifier {
        if (typeof item === "object" && !getItemValueProp) {
            throw new Error(
                "`getItemValue` is required when using array of objects"
            );
        }
        return getItemValueProp
            ? getItemValueProp(item)
            : (item as UniqueIdentifier);
    }

    function getColumn(id: UniqueIdentifier) {
        if (id in value) {
            return id;
        }

        for (const [columnId, items] of Object.entries(value)) {
            if (items.some((item) => getItemValue(item) === id)) {
                return columnId;
            }
        }

        return null;
    }

    const collisionDetection: CollisionDetection = (args) => {
        if (activeId && activeId in value) {
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    (container) => container.id in value
                ),
            });
        }

        const pointerIntersections = pointerWithin(args);
        const intersections =
            pointerIntersections.length > 0
                ? pointerIntersections
                : rectIntersection(args);
        let overId = getFirstCollision(intersections, "id");

        if (!overId) {
            if (hasMovedRef.current) {
                lastOverIdRef.current = activeId;
            }
            return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
        }

        if (overId in value) {
            const containerItems = value[overId];
            if (containerItems && containerItems.length > 0) {
                const closestItem = closestCenter({
                    ...args,
                    droppableContainers: args.droppableContainers.filter(
                        (container) =>
                            container.id !== overId &&
                            containerItems.some(
                                (item) => getItemValue(item) === container.id
                            )
                    ),
                });

                if (closestItem.length > 0) {
                    overId = closestItem[0]?.id ?? overId;
                }
            }
        }

        lastOverIdRef.current = overId;
        return [{ id: overId }];
    };

    function onDragStart(event: DragStartEvent) {
        kanbanProps.onDragStart?.(event);

        if (event.activatorEvent.defaultPrevented) {
            return;
        }
        setActiveId(event.active.id);
    }

    function onDragOver(event: DragOverEvent) {
        kanbanProps.onDragOver?.(event);

        if (event.activatorEvent.defaultPrevented) {
            return;
        }

        const { active, over } = event;
        if (!over) {
            return;
        }

        const activeColumn = getColumn(active.id);
        const overColumn = getColumn(over.id);

        if (!(activeColumn && overColumn)) {
            return;
        }

        if (activeColumn === overColumn) {
            const items = value[activeColumn];
            if (!items) {
                return;
            }

            const activeIndex = items.findIndex(
                (item) => getItemValue(item) === active.id
            );
            const overIndex = items.findIndex(
                (item) => getItemValue(item) === over.id
            );

            if (activeIndex !== overIndex) {
                const newColumns = { ...value };
                newColumns[activeColumn] = arrayMove(
                    items,
                    activeIndex,
                    overIndex
                );
                onValueChange?.(newColumns);
            }
        } else {
            const activeItems = value[activeColumn];
            const overItems = value[overColumn];

            if (!(activeItems && overItems)) {
                return;
            }

            const activeIndex = activeItems.findIndex(
                (item) => getItemValue(item) === active.id
            );

            if (activeIndex === -1) {
                return;
            }

            const activeItem = activeItems[activeIndex];
            if (!activeItem) {
                return;
            }

            const updatedItems = {
                ...value,
                [activeColumn]: activeItems.filter(
                    (item) => getItemValue(item) !== active.id
                ),
                [overColumn]: [...overItems, activeItem],
            };

            onValueChange?.(updatedItems);
            hasMovedRef.current = true;
        }
    }

    function onDragEnd(event: DragEndEvent) {
        kanbanProps.onDragEnd?.(event);

        if (event.activatorEvent.defaultPrevented) {
            return;
        }

        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        if (active.id in value && over.id in value) {
            const activeIndex = getColumnIndex(value, active.id);
            const overIndex = getColumnIndex(value, over.id);

            if (activeIndex !== overIndex) {
                const orderedColumns = arrayMove(
                    getColumnIds(value),
                    activeIndex,
                    overIndex
                );

                const newColumns: Record<UniqueIdentifier, T[]> = {};
                for (const key of orderedColumns) {
                    const items = value[key];
                    if (items) {
                        newColumns[key] = items;
                    }
                }

                if (onMove) {
                    onMove({ ...event, activeIndex, overIndex });
                } else {
                    onValueChange?.(newColumns);
                }
            }
        } else {
            const activeColumn = getColumn(active.id);
            const overColumn = getColumn(over.id);

            if (!(activeColumn && overColumn)) {
                setActiveId(null);
                return;
            }

            if (activeColumn === overColumn) {
                const items = value[activeColumn];
                if (!items) {
                    setActiveId(null);
                    return;
                }

                const activeIndex = items.findIndex(
                    (item) => getItemValue(item) === active.id
                );
                const overIndex = items.findIndex(
                    (item) => getItemValue(item) === over.id
                );

                if (activeIndex !== overIndex) {
                    const newColumns = { ...value };
                    newColumns[activeColumn] = arrayMove(
                        items,
                        activeIndex,
                        overIndex
                    );
                    if (onMove) {
                        onMove({
                            ...event,
                            activeIndex,
                            overIndex,
                        });
                    } else {
                        onValueChange?.(newColumns);
                    }
                }
            }
        }

        setActiveId(null);
        hasMovedRef.current = false;
    }

    function onDragCancel(event: DragCancelEvent) {
        kanbanProps.onDragCancel?.(event);

        if (event.activatorEvent.defaultPrevented) {
            return;
        }

        setActiveId(null);
        hasMovedRef.current = false;
    }

    const announcements: Announcements = {
        onDragCancel({ active }) {
            const isColumn = active.id in value;
            const itemType = isColumn ? "column" : "item";
            return `Dragging was cancelled. ${itemType} was dropped.`;
        },
        onDragEnd({ active, over }) {
            if (!over) {
                return;
            }

            return getDragAnnouncement({
                action: "dropped",
                activeId: active.id,
                getColumn,
                getItemValue,
                items: value,
                overId: over.id,
            });
        },
        onDragOver({ active, over }) {
            if (!over) {
                return;
            }

            return getDragAnnouncement({
                action: "moved",
                activeId: active.id,
                getColumn,
                getItemValue,
                items: value,
                overId: over.id,
            });
        },
        onDragStart({ active }) {
            const isColumn = active.id in value;
            const itemType = isColumn ? "column" : "item";
            const position = getDragAnnouncementPosition({
                getColumn,
                getItemValue,
                id: active.id,
                isColumn,
                items: value,
            });
            const total = getDragAnnouncementTotal({
                getColumn,
                id: active.id,
                isColumn,
                items: value,
            });

            return `Picked up ${itemType} at position ${position} of ${total}`;
        },
    };

    const contextValue: KanbanContextValue<T> = {
        activeId,
        flatCursor,
        getItemValue,
        id,
        items: value,
        modifiers,
        orientation,
        setActiveId,
        strategy,
    };

    return (
        <KanbanContext value={contextValue as KanbanContextValue<unknown>}>
            <DndContext
                collisionDetection={collisionDetection}
                modifiers={modifiers}
                sensors={sensors}
                {...kanbanProps}
                accessibility={{
                    announcements,
                    screenReaderInstructions: {
                        draggable: `
            To pick up a kanban item or column, press space or enter.
            While dragging, use the arrow keys to move the item.
            Press space or enter again to drop the item in its new position, or press escape to cancel.
          `,
                    },
                    ...accessibility,
                }}
                id={id}
                measuring={{
                    droppable: {
                        strategy: MeasuringStrategy.Always,
                    },
                }}
                onDragCancel={onDragCancel}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragStart={onDragStart}
            />
        </KanbanContext>
    );
}

const KanbanBoardContext = React.createContext<boolean>(false);

interface KanbanBoardProps extends React.ComponentProps<"div"> {
    children: React.ReactNode;
}

function KanbanBoard(props: KanbanBoardProps) {
    const { className, ref, ...boardProps } = props;

    const context = useKanbanContext(BOARD_NAME);

    const columns = Object.keys(context.items);

    return (
        <KanbanBoardContext value={true}>
            <SortableContext
                items={columns}
                strategy={
                    context.orientation === "horizontal"
                        ? horizontalListSortingStrategy
                        : verticalListSortingStrategy
                }
            >
                <div
                    data-orientation={context.orientation}
                    data-slot="kanban-board"
                    {...boardProps}
                    className={cn(
                        "flex size-full gap-4",
                        context.orientation === "horizontal"
                            ? "flex-row"
                            : "flex-col",
                        className
                    )}
                    ref={ref}
                />
            </SortableContext>
        </KanbanBoardContext>
    );
}

interface KanbanSortableContextValue {
    attributes: DraggableAttributes;
    disabled?: boolean;
    id: string;
    isDragging?: boolean;
    listeners: DraggableSyntheticListeners | undefined;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
}

const KanbanColumnContext =
    React.createContext<KanbanSortableContextValue | null>(null);

function useKanbanColumnContext(consumerName: string) {
    const context = React.useContext(KanbanColumnContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${COLUMN_NAME}\``
        );
    }
    return context;
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    defaultAnimateLayoutChanges({ ...args, wasDragging: true });

interface KanbanColumnProps extends React.ComponentProps<"div"> {
    asHandle?: boolean;
    children: React.ReactNode;
    disabled?: boolean;
    value: UniqueIdentifier;
}

function KanbanColumn(props: KanbanColumnProps) {
    const { value, asHandle, disabled, className, style, ref, ...columnProps } =
        props;

    const id = React.useId();
    const context = useKanbanContext(COLUMN_NAME);
    const inBoard = React.useContext(KanbanBoardContext);
    const inOverlay = React.useContext(KanbanOverlayContext);

    if (!(inBoard || inOverlay)) {
        throw new Error(
            `\`${COLUMN_NAME}\` must be used within \`${BOARD_NAME}\` or \`${OVERLAY_NAME}\``
        );
    }

    assertNonEmptyValue(value, COLUMN_NAME);

    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        isDragging,
        composedRef,
        composedStyle,
    } = useKanbanSortable(value, disabled, ref, style, {
        animateLayoutChanges,
    });

    const items = (context.items[value] ?? []).map((item) =>
        context.getItemValue(item)
    );

    const columnContext: KanbanSortableContextValue = {
        attributes,
        disabled,
        id,
        isDragging,
        listeners,
        setActivatorNodeRef,
    };

    return (
        <KanbanColumnContext value={columnContext}>
            <SortableContext
                items={items}
                strategy={
                    context.orientation === "horizontal"
                        ? horizontalListSortingStrategy
                        : verticalListSortingStrategy
                }
            >
                <div
                    data-disabled={disabled}
                    data-dragging={isDragging ? "" : undefined}
                    data-slot="kanban-column"
                    id={id}
                    {...columnProps}
                    {...(asHandle && !disabled ? attributes : {})}
                    {...(asHandle && !disabled ? listeners : {})}
                    className={cn(
                        "flex size-full shrink-0 flex-col gap-2 rounded-lg bg-muted/80 p-3 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                        {
                            "cursor-default": context.flatCursor,
                            "cursor-grab":
                                !isDragging && asHandle && !context.flatCursor,
                            "data-dragging:cursor-grabbing":
                                !context.flatCursor,
                            "opacity-50": isDragging,
                            "pointer-events-none opacity-50": disabled,
                            "touch-none select-none": asHandle,
                        },
                        className
                    )}
                    ref={composedRef}
                    style={composedStyle}
                />
            </SortableContext>
        </KanbanColumnContext>
    );
}

interface KanbanHandleProps extends React.ComponentProps<"button"> {
    flatCursor: boolean;
    slot: string;
    sortableContext: KanbanSortableContextValue;
}

function KanbanHandle({
    disabled,
    className,
    ref,
    flatCursor,
    slot,
    sortableContext,
    ...props
}: KanbanHandleProps) {
    const isDisabled = disabled ?? sortableContext.disabled;

    const composedRef = useMergedRefs(ref, (node) => {
        if (isDisabled) {
            return;
        }
        sortableContext.setActivatorNodeRef(node);
    });

    return (
        <button
            aria-controls={sortableContext.id}
            data-disabled={isDisabled}
            data-dragging={sortableContext.isDragging ? "" : undefined}
            data-slot={slot}
            type="button"
            {...props}
            {...(isDisabled ? {} : sortableContext.attributes)}
            {...(isDisabled ? {} : sortableContext.listeners)}
            className={cn(
                "select-none disabled:pointer-events-none disabled:opacity-50",
                flatCursor
                    ? "cursor-default"
                    : "cursor-grab data-dragging:cursor-grabbing",
                className
            )}
            disabled={isDisabled}
            ref={composedRef}
        />
    );
}

interface KanbanColumnHandleProps extends React.ComponentProps<"button"> {}

function KanbanColumnHandle(props: KanbanColumnHandleProps) {
    const context = useKanbanContext(COLUMN_NAME);
    const columnContext = useKanbanColumnContext(COLUMN_HANDLE_NAME);

    return (
        <KanbanHandle
            {...props}
            flatCursor={context.flatCursor}
            slot="kanban-column-handle"
            sortableContext={columnContext}
        />
    );
}

const KanbanItemContext =
    React.createContext<KanbanSortableContextValue | null>(null);

function useKanbanItemContext(consumerName: string) {
    const context = React.useContext(KanbanItemContext);
    if (!context) {
        throw new Error(
            `\`${consumerName}\` must be used within \`${ITEM_NAME}\``
        );
    }
    return context;
}

interface KanbanItemProps extends React.ComponentProps<"div"> {
    asHandle?: boolean;
    disabled?: boolean;
    value: UniqueIdentifier;
}

function KanbanItem(props: KanbanItemProps) {
    const { value, style, asHandle, disabled, className, ref, ...itemProps } =
        props;

    const id = React.useId();
    const context = useKanbanContext(ITEM_NAME);
    const inBoard = React.useContext(KanbanBoardContext);
    const inOverlay = React.useContext(KanbanOverlayContext);

    if (!(inBoard || inOverlay)) {
        throw new Error(
            `\`${ITEM_NAME}\` must be used within \`${BOARD_NAME}\``
        );
    }

    assertNonEmptyValue(value, ITEM_NAME);

    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        isDragging,
        composedRef,
        composedStyle,
    } = useKanbanSortable(value, disabled, ref, style);

    const itemContext: KanbanSortableContextValue = {
        attributes,
        disabled,
        id,
        isDragging,
        listeners,
        setActivatorNodeRef,
    };

    return (
        <KanbanItemContext value={itemContext}>
            <div
                data-disabled={disabled}
                data-dragging={isDragging ? "" : undefined}
                data-slot="kanban-item"
                id={id}
                {...itemProps}
                {...(asHandle && !disabled ? attributes : {})}
                {...(asHandle && !disabled ? listeners : {})}
                className={cn(
                    "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
                    {
                        "cursor-default": context.flatCursor,
                        "cursor-grab":
                            !isDragging && asHandle && !context.flatCursor,
                        "data-dragging:cursor-grabbing": !context.flatCursor,
                        "opacity-50": isDragging,
                        "pointer-events-none opacity-50": disabled,
                        "touch-none select-none": asHandle,
                    },
                    className
                )}
                ref={composedRef}
                style={composedStyle}
            />
        </KanbanItemContext>
    );
}

interface KanbanItemHandleProps extends React.ComponentProps<"button"> {}

function KanbanItemHandle(props: KanbanItemHandleProps) {
    const context = useKanbanContext(ITEM_HANDLE_NAME);
    const itemContext = useKanbanItemContext(ITEM_HANDLE_NAME);

    return (
        <KanbanHandle
            {...props}
            flatCursor={context.flatCursor}
            slot="kanban-item-handle"
            sortableContext={itemContext}
        />
    );
}

const KanbanOverlayContext = React.createContext(false);

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: "0.4",
            },
        },
    }),
};

interface KanbanOverlayProps
    extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
    children?:
        | React.ReactNode
        | ((params: {
              value: UniqueIdentifier;
              variant: "column" | "item";
          }) => React.ReactNode);
    container?: Element | DocumentFragment | null;
}

function KanbanOverlay(props: KanbanOverlayProps) {
    const { container: containerProp, children, ...overlayProps } = props;

    const context = useKanbanContext(OVERLAY_NAME);

    const [mounted, setMounted] = React.useState(false);

    React.useLayoutEffect(() => setMounted(true), []);

    const container =
        containerProp ?? (mounted ? globalThis.document?.body : null);

    if (!container) {
        return null;
    }

    const variant =
        context.activeId && context.activeId in context.items
            ? "column"
            : "item";

    let overlayChild: React.ReactNode = null;
    if (context.activeId && children) {
        if (typeof children === "function") {
            overlayChild = children({
                value: context.activeId,
                variant,
            });
        } else {
            overlayChild = children;
        }
    }

    return ReactDOM.createPortal(
        <DragOverlay
            className={cn(!context.flatCursor && "cursor-grabbing")}
            dropAnimation={dropAnimation}
            modifiers={context.modifiers}
            {...overlayProps}
        >
            <KanbanOverlayContext value={true}>
                {overlayChild}
            </KanbanOverlayContext>
        </DragOverlay>,
        container
    );
}

export {
    Kanban,
    KanbanBoard,
    KanbanColumn,
    KanbanColumnHandle,
    KanbanItem,
    KanbanItemHandle,
    KanbanOverlay,
    type KanbanProps,
};
