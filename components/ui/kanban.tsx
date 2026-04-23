"use client";

import { useComposedRefs } from "@/hooks/compose-refs";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-effect";
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
import { CSS } from "@dnd-kit/utilities";
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

    const getItemValue = React.useCallback(
        (item: T): UniqueIdentifier => {
            if (typeof item === "object" && !getItemValueProp) {
                throw new Error(
                    "`getItemValue` is required when using array of objects"
                );
            }
            return getItemValueProp
                ? getItemValueProp(item)
                : (item as UniqueIdentifier);
        },
        [getItemValueProp]
    );

    const getColumn = React.useCallback(
        (id: UniqueIdentifier) => {
            if (id in value) {
                return id;
            }

            for (const [columnId, items] of Object.entries(value)) {
                if (items.some((item) => getItemValue(item) === id)) {
                    return columnId;
                }
            }

            return null;
        },
        [value, getItemValue]
    );

    const collisionDetection: CollisionDetection = React.useCallback(
        (args) => {
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
                return lastOverIdRef.current
                    ? [{ id: lastOverIdRef.current }]
                    : [];
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
                                    (item) =>
                                        getItemValue(item) === container.id
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
        },
        [activeId, value, getItemValue]
    );

    const onDragStart = React.useCallback(
        (event: DragStartEvent) => {
            kanbanProps.onDragStart?.(event);

            if (event.activatorEvent.defaultPrevented) {
                return;
            }
            setActiveId(event.active.id);
        },
        [kanbanProps.onDragStart]
    );

    const onDragOver = React.useCallback(
        (event: DragOverEvent) => {
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
        },
        [value, getColumn, getItemValue, onValueChange, kanbanProps.onDragOver]
    );

    const onDragEnd = React.useCallback(
        (event: DragEndEvent) => {
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
                const activeIndex = Object.keys(value).indexOf(
                    active.id as string
                );
                const overIndex = Object.keys(value).indexOf(over.id as string);

                if (activeIndex !== overIndex) {
                    const orderedColumns = Object.keys(value);
                    const newOrder = arrayMove(
                        orderedColumns,
                        activeIndex,
                        overIndex
                    );

                    const newColumns: Record<UniqueIdentifier, T[]> = {};
                    for (const key of newOrder) {
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
        },
        [
            value,
            getColumn,
            getItemValue,
            onValueChange,
            onMove,
            kanbanProps.onDragEnd,
        ]
    );

    const onDragCancel = React.useCallback(
        (event: DragCancelEvent) => {
            kanbanProps.onDragCancel?.(event);

            if (event.activatorEvent.defaultPrevented) {
                return;
            }

            setActiveId(null);
            hasMovedRef.current = false;
        },
        [kanbanProps.onDragCancel]
    );

    const announcements: Announcements = React.useMemo(
        () => ({
            onDragCancel({ active }) {
                const isColumn = active.id in value;
                const itemType = isColumn ? "column" : "item";
                return `Dragging was cancelled. ${itemType} was dropped.`;
            },
            onDragEnd({ active, over }) {
                if (!over) {
                    return;
                }

                const isColumn = active.id in value;
                const itemType = isColumn ? "column" : "item";
                const position = isColumn
                    ? Object.keys(value).indexOf(over.id as string) + 1
                    : (() => {
                          const column = getColumn(over.id);
                          if (!(column && value[column])) {
                              return 1;
                          }
                          return (
                              value[column].findIndex(
                                  (item) => getItemValue(item) === over.id
                              ) + 1
                          );
                      })();
                const total = isColumn
                    ? Object.keys(value).length
                    : (() => {
                          const column = getColumn(over.id);
                          return column ? (value[column]?.length ?? 0) : 0;
                      })();

                const overColumn = getColumn(over.id);
                const activeColumn = getColumn(active.id);

                if (isColumn) {
                    return `${itemType} was dropped at position ${position} of ${total}`;
                }

                if (activeColumn !== overColumn) {
                    return `${itemType} was dropped at position ${position} of ${total} in ${overColumn}`;
                }

                return `${itemType} was dropped at position ${position} of ${total}`;
            },
            onDragOver({ active, over }) {
                if (!over) {
                    return;
                }

                const isColumn = active.id in value;
                const itemType = isColumn ? "column" : "item";
                const position = isColumn
                    ? Object.keys(value).indexOf(over.id as string) + 1
                    : (() => {
                          const column = getColumn(over.id);
                          if (!(column && value[column])) {
                              return 1;
                          }
                          return (
                              value[column].findIndex(
                                  (item) => getItemValue(item) === over.id
                              ) + 1
                          );
                      })();
                const total = isColumn
                    ? Object.keys(value).length
                    : (() => {
                          const column = getColumn(over.id);
                          return column ? (value[column]?.length ?? 0) : 0;
                      })();

                const overColumn = getColumn(over.id);
                const activeColumn = getColumn(active.id);

                if (isColumn) {
                    return `${itemType} is now at position ${position} of ${total}`;
                }

                if (activeColumn !== overColumn) {
                    return `${itemType} is now at position ${position} of ${total} in ${overColumn}`;
                }

                return `${itemType} is now at position ${position} of ${total}`;
            },
            onDragStart({ active }) {
                const isColumn = active.id in value;
                const itemType = isColumn ? "column" : "item";
                const position = isColumn
                    ? Object.keys(value).indexOf(active.id as string) + 1
                    : (() => {
                          const column = getColumn(active.id);
                          if (!(column && value[column])) {
                              return 1;
                          }
                          return (
                              value[column].findIndex(
                                  (item) => getItemValue(item) === active.id
                              ) + 1
                          );
                      })();
                const total = isColumn
                    ? Object.keys(value).length
                    : (() => {
                          const column = getColumn(active.id);
                          return column ? (value[column]?.length ?? 0) : 0;
                      })();

                return `Picked up ${itemType} at position ${position} of ${total}`;
            },
        }),
        [value, getColumn, getItemValue]
    );

    const contextValue = React.useMemo<KanbanContextValue<T>>(
        () => ({
            activeId,
            flatCursor,
            getItemValue,
            id,
            items: value,
            modifiers,
            orientation,
            setActiveId,
            strategy,
        }),
        [
            id,
            value,
            activeId,
            modifiers,
            strategy,
            orientation,
            getItemValue,
            flatCursor,
        ]
    );

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
    asChild?: boolean;
    children: React.ReactNode;
}

function KanbanBoard(props: KanbanBoardProps) {
    const { asChild, className, ref, ...boardProps } = props;

    const context = useKanbanContext(BOARD_NAME);

    const columns = React.useMemo(
        () => Object.keys(context.items),
        [context.items]
    );

    const BoardPrimitive = "div";

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
                <BoardPrimitive
                    aria-orientation={context.orientation}
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

interface KanbanColumnContextValue {
    attributes: DraggableAttributes;
    disabled?: boolean;
    id: string;
    isDragging?: boolean;
    listeners: DraggableSyntheticListeners | undefined;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
}

const KanbanColumnContext =
    React.createContext<KanbanColumnContextValue | null>(null);

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
    asChild?: boolean;
    asHandle?: boolean;
    children: React.ReactNode;
    disabled?: boolean;
    value: UniqueIdentifier;
}

function KanbanColumn(props: KanbanColumnProps) {
    const {
        value,
        asChild,
        asHandle,
        disabled,
        className,
        style,
        ref,
        ...columnProps
    } = props;

    const id = React.useId();
    const context = useKanbanContext(COLUMN_NAME);
    const inBoard = React.useContext(KanbanBoardContext);
    const inOverlay = React.useContext(KanbanOverlayContext);

    if (!(inBoard || inOverlay)) {
        throw new Error(
            `\`${COLUMN_NAME}\` must be used within \`${BOARD_NAME}\` or \`${OVERLAY_NAME}\``
        );
    }

    if (value === "") {
        throw new Error(`\`${COLUMN_NAME}\` value cannot be an empty string`);
    }

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        animateLayoutChanges,
        disabled,
        id: value,
    });

    const composedRef = useComposedRefs(ref, (node) => {
        if (disabled) {
            return;
        }
        setNodeRef(node);
    });

    const composedStyle = React.useMemo<React.CSSProperties>(
        () => ({
            transform: CSS.Transform.toString(transform),
            transition,
            ...style,
        }),
        [transform, transition, style]
    );

    const items = React.useMemo(() => {
        const items = context.items[value] ?? [];
        return items.map((item) => context.getItemValue(item));
    }, [context.items, value, context.getItemValue]);

    const columnContext = React.useMemo<KanbanColumnContextValue>(
        () => ({
            attributes,
            disabled,
            id,
            isDragging,
            listeners,
            setActivatorNodeRef,
        }),
        [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled]
    );

    const ColumnPrimitive = "div";

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
                <ColumnPrimitive
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

interface KanbanColumnHandleProps extends React.ComponentProps<"button"> {
    asChild?: boolean;
}

function KanbanColumnHandle(props: KanbanColumnHandleProps) {
    const { asChild, disabled, className, ref, ...columnHandleProps } = props;

    const context = useKanbanContext(COLUMN_NAME);
    const columnContext = useKanbanColumnContext(COLUMN_HANDLE_NAME);

    const isDisabled = disabled ?? columnContext.disabled;

    const composedRef = useComposedRefs(ref, (node) => {
        if (isDisabled) {
            return;
        }
        columnContext.setActivatorNodeRef(node);
    });

    const HandlePrimitive = "button";

    return (
        <HandlePrimitive
            aria-controls={columnContext.id}
            data-disabled={isDisabled}
            data-dragging={columnContext.isDragging ? "" : undefined}
            data-slot="kanban-column-handle"
            type="button"
            {...columnHandleProps}
            {...(isDisabled ? {} : columnContext.attributes)}
            {...(isDisabled ? {} : columnContext.listeners)}
            className={cn(
                "select-none disabled:pointer-events-none disabled:opacity-50",
                context.flatCursor
                    ? "cursor-default"
                    : "cursor-grab data-dragging:cursor-grabbing",
                className
            )}
            disabled={isDisabled}
            ref={composedRef}
        />
    );
}

interface KanbanItemContextValue {
    attributes: DraggableAttributes;
    disabled?: boolean;
    id: string;
    isDragging?: boolean;
    listeners: DraggableSyntheticListeners | undefined;
    setActivatorNodeRef: (node: HTMLElement | null) => void;
}

const KanbanItemContext = React.createContext<KanbanItemContextValue | null>(
    null
);

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
    asChild?: boolean;
    asHandle?: boolean;
    disabled?: boolean;
    value: UniqueIdentifier;
}

function KanbanItem(props: KanbanItemProps) {
    const {
        value,
        style,
        asHandle,
        asChild,
        disabled,
        className,
        ref,
        ...itemProps
    } = props;

    const id = React.useId();
    const context = useKanbanContext(ITEM_NAME);
    const inBoard = React.useContext(KanbanBoardContext);
    const inOverlay = React.useContext(KanbanOverlayContext);

    if (!(inBoard || inOverlay)) {
        throw new Error(
            `\`${ITEM_NAME}\` must be used within \`${BOARD_NAME}\``
        );
    }

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ disabled, id: value });

    if (value === "") {
        throw new Error(`\`${ITEM_NAME}\` value cannot be an empty string`);
    }

    const composedRef = useComposedRefs(ref, (node) => {
        if (disabled) {
            return;
        }
        setNodeRef(node);
    });

    const composedStyle = React.useMemo<React.CSSProperties>(
        () => ({
            transform: CSS.Transform.toString(transform),
            transition,
            ...style,
        }),
        [transform, transition, style]
    );

    const itemContext = React.useMemo<KanbanItemContextValue>(
        () => ({
            attributes,
            disabled,
            id,
            isDragging,
            listeners,
            setActivatorNodeRef,
        }),
        [id, attributes, listeners, setActivatorNodeRef, isDragging, disabled]
    );

    const ItemPrimitive = "div";

    return (
        <KanbanItemContext value={itemContext}>
            <ItemPrimitive
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

interface KanbanItemHandleProps extends React.ComponentProps<"button"> {
    asChild?: boolean;
}

function KanbanItemHandle(props: KanbanItemHandleProps) {
    const { asChild, disabled, className, ref, ...itemHandleProps } = props;

    const context = useKanbanContext(ITEM_HANDLE_NAME);
    const itemContext = useKanbanItemContext(ITEM_HANDLE_NAME);

    const isDisabled = disabled ?? itemContext.disabled;

    const composedRef = useComposedRefs(ref, (node) => {
        if (isDisabled) {
            return;
        }
        itemContext.setActivatorNodeRef(node);
    });

    const HandlePrimitive = "button";

    return (
        <HandlePrimitive
            aria-controls={itemContext.id}
            data-disabled={isDisabled}
            data-dragging={itemContext.isDragging ? "" : undefined}
            data-slot="kanban-item-handle"
            type="button"
            {...itemHandleProps}
            {...(isDisabled ? {} : itemContext.attributes)}
            {...(isDisabled ? {} : itemContext.listeners)}
            className={cn(
                "select-none disabled:pointer-events-none disabled:opacity-50",
                context.flatCursor
                    ? "cursor-default"
                    : "cursor-grab data-dragging:cursor-grabbing",
                className
            )}
            disabled={isDisabled}
            ref={composedRef}
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

    useIsomorphicLayoutEffect(() => setMounted(true), []);

    const container =
        containerProp ?? (mounted ? globalThis.document?.body : null);

    if (!container) {
        return null;
    }

    const variant =
        context.activeId && context.activeId in context.items
            ? "column"
            : "item";

    return ReactDOM.createPortal(
        <DragOverlay
            className={cn(!context.flatCursor && "cursor-grabbing")}
            dropAnimation={dropAnimation}
            modifiers={context.modifiers}
            {...overlayProps}
        >
            <KanbanOverlayContext value={true}>
                {context.activeId && children
                    ? // biome-ignore lint/style/noNestedTernary: Ignore
                      typeof children === "function"
                        ? children({
                              value: context.activeId,
                              variant,
                          })
                        : children
                    : null}
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
