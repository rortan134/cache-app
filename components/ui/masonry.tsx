"use client";

import { ownerDocument, ownerWindow } from "@base-ui/utils/owner";
import {
    AnimationFrame,
    useAnimationFrame,
} from "@base-ui/utils/useAnimationFrame";
import { useIsoLayoutEffect } from "@base-ui/utils/useIsoLayoutEffect";
import { useMergedRefs } from "@base-ui/utils/useMergedRefs";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { useTimeout } from "@base-ui/utils/useTimeout";
import { useValueAsRef } from "@base-ui/utils/useValueAsRef";
import justifiedLayout from "justified-layout";
import * as React from "react";

// #region Interval tree definitions
const NODE_COLOR = {
    BLACK: 1,
    RED: 0,
    SENTINEL: 2,
} as const;

const NODE_OPERATION = {
    PRESERVE: 1,
    REMOVE: 0,
} as const;

type NodeColor = (typeof NODE_COLOR)[keyof typeof NODE_COLOR];
type NodeOperation = (typeof NODE_OPERATION)[keyof typeof NODE_OPERATION];

interface ListNode {
    high: number;
    index: number;
    next: ListNode | null;
}

interface TreeNode {
    color: NodeColor;
    high: number;
    left: TreeNode;
    list: ListNode;
    low: number;
    max: number;
    parent: TreeNode;
    right: TreeNode;
}

interface Tree {
    root: TreeNode;
    size: number;
}

function addInterval(treeNode: TreeNode, high: number, index: number): boolean {
    let node: ListNode | null = treeNode.list;
    let prevNode: ListNode | undefined;

    while (node) {
        if (node.index === index) {
            return false;
        }
        if (high > node.high) {
            break;
        }
        prevNode = node;
        node = node.next;
    }

    if (!prevNode) {
        treeNode.list = { high, index, next: node };
    }
    if (prevNode) {
        prevNode.next = { high, index, next: prevNode.next };
    }

    return true;
}

function removeInterval(
    treeNode: TreeNode,
    index: number
): NodeOperation | undefined {
    let node: ListNode | null = treeNode.list;
    if (node.index === index) {
        if (node.next === null) {
            return NODE_OPERATION.REMOVE;
        }
        treeNode.list = node.next;
        return NODE_OPERATION.PRESERVE;
    }

    let prevNode: ListNode | undefined = node;
    node = node.next;

    while (node !== null) {
        if (node.index === index) {
            prevNode.next = node.next;
            return NODE_OPERATION.PRESERVE;
        }
        prevNode = node;
        node = node.next;
    }
}

const SENTINEL_NODE: TreeNode = {
    color: NODE_COLOR.SENTINEL,
    high: 0,
    left: undefined as unknown as TreeNode,
    list: undefined as unknown as ListNode,
    low: 0,
    max: 0,
    parent: undefined as unknown as TreeNode,
    right: undefined as unknown as TreeNode,
};
SENTINEL_NODE.parent = SENTINEL_NODE;
SENTINEL_NODE.left = SENTINEL_NODE;
SENTINEL_NODE.right = SENTINEL_NODE;

function updateMax(node: TreeNode) {
    const max = node.high;
    if (node.left === SENTINEL_NODE && node.right === SENTINEL_NODE) {
        node.max = max;
    } else if (node.left === SENTINEL_NODE) {
        node.max = Math.max(node.right.max, max);
    } else if (node.right === SENTINEL_NODE) {
        node.max = Math.max(node.left.max, max);
    } else {
        node.max = Math.max(Math.max(node.left.max, node.right.max), max);
    }
}

function updateMaxUp(node: TreeNode) {
    let x = node;

    while (x.parent !== SENTINEL_NODE) {
        updateMax(x.parent);
        x = x.parent;
    }
}

function rotateLeft(tree: Tree, x: TreeNode) {
    if (x.right === SENTINEL_NODE) {
        return;
    }
    const y = x.right;
    x.right = y.left;
    if (y.left !== SENTINEL_NODE) {
        y.left.parent = x;
    }
    y.parent = x.parent;

    if (x.parent === SENTINEL_NODE) {
        tree.root = y;
    } else if (x === x.parent.left) {
        x.parent.left = y;
    } else {
        x.parent.right = y;
    }

    y.left = x;
    x.parent = y;

    updateMax(x);
    updateMax(y);
}

function rotateRight(tree: Tree, x: TreeNode) {
    if (x.left === SENTINEL_NODE) {
        return;
    }
    const y = x.left;
    x.left = y.right;
    if (y.right !== SENTINEL_NODE) {
        y.right.parent = x;
    }
    y.parent = x.parent;

    if (x.parent === SENTINEL_NODE) {
        tree.root = y;
    } else if (x === x.parent.right) {
        x.parent.right = y;
    } else {
        x.parent.left = y;
    }

    y.right = x;
    x.parent = y;

    updateMax(x);
    updateMax(y);
}

function replaceNode(tree: Tree, x: TreeNode, y: TreeNode) {
    if (x.parent === SENTINEL_NODE) {
        tree.root = y;
    } else if (x === x.parent.left) {
        x.parent.left = y;
    } else {
        x.parent.right = y;
    }
    y.parent = x.parent;
}

function fixRemove(tree: Tree, node: TreeNode) {
    let x = node;
    let w: TreeNode;

    while (x !== SENTINEL_NODE && x.color === NODE_COLOR.BLACK) {
        if (x === x.parent.left) {
            w = x.parent.right;

            if (w.color === NODE_COLOR.RED) {
                w.color = NODE_COLOR.BLACK;
                x.parent.color = NODE_COLOR.RED;
                rotateLeft(tree, x.parent);
                w = x.parent.right;
            }

            if (
                w.left.color === NODE_COLOR.BLACK &&
                w.right.color === NODE_COLOR.BLACK
            ) {
                w.color = NODE_COLOR.RED;
                x = x.parent;
            } else {
                if (w.right.color === NODE_COLOR.BLACK) {
                    w.left.color = NODE_COLOR.BLACK;
                    w.color = NODE_COLOR.RED;
                    rotateRight(tree, w);
                    w = x.parent.right;
                }

                w.color = x.parent.color;
                x.parent.color = NODE_COLOR.BLACK;
                w.right.color = NODE_COLOR.BLACK;
                rotateLeft(tree, x.parent);
                x = tree.root;
            }
        } else {
            w = x.parent.left;

            if (w.color === NODE_COLOR.RED) {
                w.color = NODE_COLOR.BLACK;
                x.parent.color = NODE_COLOR.RED;
                rotateRight(tree, x.parent);
                w = x.parent.left;
            }

            if (
                w.right.color === NODE_COLOR.BLACK &&
                w.left.color === NODE_COLOR.BLACK
            ) {
                w.color = NODE_COLOR.RED;
                x = x.parent;
            } else {
                if (w.left.color === NODE_COLOR.BLACK) {
                    w.right.color = NODE_COLOR.BLACK;
                    w.color = NODE_COLOR.RED;
                    rotateLeft(tree, w);
                    w = x.parent.left;
                }

                w.color = x.parent.color;
                x.parent.color = NODE_COLOR.BLACK;
                w.left.color = NODE_COLOR.BLACK;
                rotateRight(tree, x.parent);
                x = tree.root;
            }
        }
    }

    x.color = NODE_COLOR.BLACK;
}

function minimumTree(node: TreeNode) {
    let current = node;
    while (current.left !== SENTINEL_NODE) {
        current = current.left;
    }
    return current;
}

function fixInsert(tree: Tree, node: TreeNode) {
    let current = node;
    let y: TreeNode;

    while (current.parent.color === NODE_COLOR.RED) {
        if (current.parent === current.parent.parent.left) {
            y = current.parent.parent.right;

            if (y.color === NODE_COLOR.RED) {
                current.parent.color = NODE_COLOR.BLACK;
                y.color = NODE_COLOR.BLACK;
                current.parent.parent.color = NODE_COLOR.RED;
                current = current.parent.parent;
            } else {
                if (current === current.parent.right) {
                    current = current.parent;
                    rotateLeft(tree, current);
                }

                current.parent.color = NODE_COLOR.BLACK;
                current.parent.parent.color = NODE_COLOR.RED;
                rotateRight(tree, current.parent.parent);
            }
        } else {
            y = current.parent.parent.left;

            if (y.color === NODE_COLOR.RED) {
                current.parent.color = NODE_COLOR.BLACK;
                y.color = NODE_COLOR.BLACK;
                current.parent.parent.color = NODE_COLOR.RED;
                current = current.parent.parent;
            } else {
                if (current === current.parent.left) {
                    current = current.parent;
                    rotateRight(tree, current);
                }

                current.parent.color = NODE_COLOR.BLACK;
                current.parent.parent.color = NODE_COLOR.RED;
                rotateLeft(tree, current.parent.parent);
            }
        }
    }
    tree.root.color = NODE_COLOR.BLACK;
}

interface IntervalTree {
    insert(low: number, high: number, index: number): void;
    remove(index: number): void;
    search(
        low: number,
        high: number,
        onCallback: (index: number, low: number) => void
    ): void;
    size: number;
}

function createIntervalTree(): IntervalTree {
    const tree: Tree = {
        root: SENTINEL_NODE,
        size: 0,
    };

    const indexMap: Record<number, TreeNode> = {};

    return {
        insert(low, high, index) {
            let x: TreeNode = tree.root;
            let y: TreeNode = SENTINEL_NODE;

            while (x !== SENTINEL_NODE) {
                y = x;
                if (low === y.low) {
                    break;
                }
                if (low < x.low) {
                    x = x.left;
                } else {
                    x = x.right;
                }
            }

            if (low === y.low && y !== SENTINEL_NODE) {
                if (!addInterval(y, high, index)) {
                    return;
                }
                y.high = Math.max(y.high, high);
                updateMax(y);
                updateMaxUp(y);
                indexMap[index] = y;
                tree.size++;
                return;
            }

            const z: TreeNode = {
                color: NODE_COLOR.RED,
                high,
                left: SENTINEL_NODE,
                list: { high, index, next: null },
                low,
                max: high,
                parent: y,
                right: SENTINEL_NODE,
            };

            if (y === SENTINEL_NODE) {
                tree.root = z;
            } else {
                if (z.low < y.low) {
                    y.left = z;
                } else {
                    y.right = z;
                }
                updateMaxUp(z);
            }

            fixInsert(tree, z);
            indexMap[index] = z;
            tree.size++;
        },

        remove(index) {
            const z = indexMap[index];
            if (z === undefined) {
                return;
            }
            delete indexMap[index];

            const intervalResult = removeInterval(z, index);
            if (intervalResult === undefined) {
                return;
            }
            if (intervalResult === NODE_OPERATION.PRESERVE) {
                z.high = z.list.high;
                updateMax(z);
                updateMaxUp(z);
                tree.size--;
                return;
            }

            let y = z;
            let originalYColor = y.color;
            let x: TreeNode;

            if (z.left === SENTINEL_NODE) {
                x = z.right;
                replaceNode(tree, z, z.right);
            } else if (z.right === SENTINEL_NODE) {
                x = z.left;
                replaceNode(tree, z, z.left);
            } else {
                y = minimumTree(z.right);
                originalYColor = y.color;
                x = y.right;

                if (y.parent === z) {
                    x.parent = y;
                } else {
                    replaceNode(tree, y, y.right);
                    y.right = z.right;
                    y.right.parent = y;
                }

                replaceNode(tree, z, y);
                y.left = z.left;
                y.left.parent = y;
                y.color = z.color;
            }

            updateMax(x);
            updateMaxUp(x);

            if (originalYColor === NODE_COLOR.BLACK) {
                fixRemove(tree, x);
            }
            tree.size--;
        },

        search(low, high, onCallback) {
            const stack = [tree.root];
            while (stack.length !== 0) {
                const node = stack.pop();
                if (!node) {
                    continue;
                }
                if (node === SENTINEL_NODE || low > node.max) {
                    continue;
                }
                if (node.left !== SENTINEL_NODE) {
                    stack.push(node.left);
                }
                if (node.right !== SENTINEL_NODE) {
                    stack.push(node.right);
                }
                if (node.low <= high && node.high >= low) {
                    let curr: ListNode | null = node.list;
                    while (curr !== null) {
                        if (curr.high >= low) {
                            onCallback(curr.index, node.low);
                        }
                        curr = curr.next;
                    }
                }
            }
        },

        get size() {
            return tree.size;
        },
    };
}
// #endregion

// #region Deep memo cache definitions
type CacheKey = string | number | symbol;
type CacheConstructor = (new () => Cache) | Record<CacheKey, unknown>;

interface Cache<K = CacheKey, V = unknown> {
    get: (k: K) => V | undefined;
    set: (k: K, v: V) => V;
}

function onDeepMemo<T extends unknown[], U>(
    constructors: CacheConstructor[],
    fn: (...args: T) => U
): (...args: T) => U {
    if (!(constructors.length && constructors[0])) {
        throw new Error("At least one constructor is required");
    }

    function createCache(obj: CacheConstructor): Cache {
        let cache: Cache;
        if (typeof obj === "function") {
            try {
                cache = new (obj as new () => Cache)();
            } catch (_err) {
                cache = new Map<CacheKey, unknown>();
            }
        } else {
            cache = obj as unknown as Cache;
        }
        return {
            get(k: CacheKey): unknown | undefined {
                return cache.get(k);
            },
            set(k: CacheKey, v: unknown): unknown {
                cache.set(k, v);
                return v;
            },
        };
    }

    const depth = constructors.length;
    const baseCache = createCache(constructors[0]);

    let base: Cache | undefined;
    let map: Cache | undefined;
    let node: Cache;
    let i: number;
    const one = depth === 1;

    function get(args: unknown[]): unknown {
        if (depth < 3) {
            const key = args[0] as CacheKey;
            base = baseCache.get(key) as Cache | undefined;
            return one ? base : base?.get(args[1] as CacheKey);
        }

        node = baseCache;
        for (i = 0; i < depth; i++) {
            const next = node.get(args[i] as CacheKey);
            if (!next) {
                return;
            }
            node = next as Cache;
        }
        return node;
    }

    function set(args: unknown[], value: unknown): unknown {
        if (depth < 3) {
            if (one) {
                baseCache.set(args[0] as CacheKey, value);
            } else {
                base = baseCache.get(args[0] as CacheKey) as Cache | undefined;
                if (base) {
                    base.set(args[1] as CacheKey, value);
                } else {
                    if (!constructors[1]) {
                        throw new Error(
                            "Second constructor is required for non-single depth cache"
                        );
                    }
                    map = createCache(constructors[1]);
                    map.set(args[1] as CacheKey, value);
                    baseCache.set(args[0] as CacheKey, map);
                }
            }
            return value;
        }

        node = baseCache;
        for (i = 0; i < depth - 1; i++) {
            map = node.get(args[i] as CacheKey) as Cache | undefined;
            if (map) {
                node = map;
            } else {
                const nextConstructor = constructors[i + 1];
                if (!nextConstructor) {
                    throw new Error(
                        `Constructor at index ${i + 1} is required`
                    );
                }
                map = createCache(nextConstructor);
                node.set(args[i] as CacheKey, map);
                node = map;
            }
        }
        node.set(args[depth - 1] as CacheKey, value);
        return value;
    }

    return (...args: T): U => {
        const cached = get(args);
        if (cached === undefined) {
            return set(args, fn(...args)) as U;
        }
        return cached as U;
    };
}
// #endregion

// #region Masonry layout definitions
const COLUMN_WIDTH = 200;
const GAP = 0;
const ITEM_HEIGHT = 300;
const OVERSCAN = 2;
const SCROLL_FPS = 24;
const DEBOUNCE_DELAY = 300;

interface Positioner {
    all: () => PositionerItem[];
    columnCount: number;
    columnWidth: number;
    estimateHeight: (itemCount: number, defaultItemHeight: number) => number;
    get: (index: number) => PositionerItem | undefined;
    range: (
        low: number,
        high: number,
        onItemRender: (index: number, left: number, top: number) => void
    ) => void;
    set: (index: number, height: number) => void;
    shortestColumn: () => number;
    size: () => number;
    update: (updates: number[]) => void;
}

interface PositionerItem {
    columnIndex: number;
    height: number;
    left: number;
    top: number;
    width: number;
}

function isPositionerItem(
    item: PositionerItem | undefined
): item is PositionerItem {
    return item !== undefined;
}

function createJustifiedPositioner(
    width: number,
    aspectRatios: number[],
    options: {
        containerPadding?:
            | number
            | { top: number; right: number; bottom: number; left: number };
        boxSpacing?: number | { horizontal: number; vertical: number };
        targetRowHeight?: number;
        targetRowHeightTolerance?: number;
        maxNumRows?: number;
        showWidows?: boolean;
        fullWidthBreakoutRowCadence?: false | number;
    }
): Positioner {
    const safeWidth = Math.max(1, width);
    const result = justifiedLayout(aspectRatios, {
        boxSpacing: options.boxSpacing ?? 0,
        containerPadding: options.containerPadding ?? 0,
        containerWidth: safeWidth,
        fullWidthBreakoutRowCadence:
            options.fullWidthBreakoutRowCadence ?? false,
        maxNumRows: options.maxNumRows ?? Number.POSITIVE_INFINITY,
        showWidows: options.showWidows ?? true,
        targetRowHeight: options.targetRowHeight ?? 320,
        targetRowHeightTolerance: options.targetRowHeightTolerance ?? 0.25,
    });

    const items: (PositionerItem | undefined)[] = [];
    const intervalTree = createIntervalTree();

    for (let i = 0; i < result.boxes.length; i++) {
        const box = result.boxes[i];
        if (!box) {
            continue;
        }

        const item: PositionerItem = {
            columnIndex: 0,
            height: box.height,
            left: box.left,
            top: box.top,
            width: box.width,
        };
        items[i] = item;
        intervalTree.insert(box.top, box.top + box.height, i);
    }

    return {
        all: () => items.filter(isPositionerItem),
        columnCount: 1,
        columnWidth: safeWidth,
        estimateHeight: () => result.containerHeight,
        get: (index) => items[index],
        range: (low, high, callback) => {
            intervalTree.search(low, high, (index, top) => {
                const item = items[index];
                if (!item) {
                    return;
                }
                callback(index, item.left, top);
            });
        },
        set: () => {
            /* no-op: positions are precomputed from aspect ratios */
        },
        shortestColumn: () => result.containerHeight,
        size: () => result.boxes.length,
        update: () => {
            /* no-op: aspect ratios drive layout, not DOM measurements */
        },
    };
}

interface UsePositionerOptions {
    aspectRatios?: number[];
    boxSpacing?: number | { horizontal: number; vertical: number };
    columnCount?: number;
    columnGap?: number;
    columnWidth?: number;
    containerPadding?:
        | number
        | { top: number; right: number; bottom: number; left: number };
    fullWidthBreakoutRowCadence?: false | number;
    layout?: "masonry" | "justified";
    maxColumnCount?: number;
    maxNumRows?: number;
    rowGap?: number;
    showWidows?: boolean;
    targetRowHeight?: number;
    targetRowHeightTolerance?: number;
    width: number;
}

function usePositioner(
    {
        aspectRatios,
        boxSpacing,
        columnCount,
        columnGap = GAP,
        columnWidth = COLUMN_WIDTH,
        containerPadding,
        fullWidthBreakoutRowCadence,
        layout = "masonry",
        maxColumnCount,
        maxNumRows,
        rowGap,
        showWidows,
        targetRowHeight,
        targetRowHeightTolerance,
        width,
    }: UsePositionerOptions,
    deps: React.DependencyList = []
): Positioner {
    function initPositioner(): Positioner {
        if (layout === "justified" && aspectRatios) {
            return createJustifiedPositioner(width, aspectRatios, {
                boxSpacing,
                containerPadding,
                fullWidthBreakoutRowCadence,
                maxNumRows,
                showWidows,
                targetRowHeight,
                targetRowHeightTolerance,
            });
        }
        function binarySearch(a: number[], y: number): number {
            let l = 0;
            let h = a.length - 1;

            while (l <= h) {
                const m = Math.floor((l + h) / 2);
                const x = a[m];
                if (x === y) {
                    return m;
                }
                if (x === undefined || x <= y) {
                    l = m + 1;
                } else {
                    h = m - 1;
                }
            }

            return -1;
        }

        const computedColumnCount =
            columnCount ||
            Math.min(
                Math.floor((width + columnGap) / (columnWidth + columnGap)),
                maxColumnCount || Number.POSITIVE_INFINITY
            ) ||
            1;
        const computedColumnWidth = Math.floor(
            (width - columnGap * (computedColumnCount - 1)) /
                computedColumnCount
        );

        const intervalTree = createIntervalTree();
        const columnHeights: number[] = new Array(computedColumnCount);
        const items: (PositionerItem | undefined)[] = [];
        const columnItems: number[][] = new Array(computedColumnCount);
        const itemGap = rowGap ?? columnGap;

        for (let i = 0; i < computedColumnCount; i++) {
            columnHeights[i] = 0;
            columnItems[i] = [];
        }

        return {
            all(): PositionerItem[] {
                return items.filter(isPositionerItem);
            },
            columnCount: computedColumnCount,
            columnWidth: computedColumnWidth,
            estimateHeight: (itemCount, defaultItemHeight): number => {
                const tallestColumn = Math.max(
                    0,
                    Math.max.apply(null, columnHeights)
                );

                return itemCount === intervalTree.size
                    ? tallestColumn
                    : tallestColumn +
                          Math.ceil(
                              (itemCount - intervalTree.size) /
                                  computedColumnCount
                          ) *
                              defaultItemHeight;
            },
            get: (index: number) => items[index],
            range: (low, high, onItemRender) => {
                intervalTree.search(low, high, (index: number, top: number) => {
                    const item = items[index];
                    if (!item) {
                        return;
                    }
                    onItemRender(index, item.left, top);
                });
            },
            set: (index: number, height = 0) => {
                let columnIndex = 0;

                const preferredColumn = index % computedColumnCount;

                let shortestHeight = columnHeights[0] ?? 0;
                let shortestIndex = 0;

                for (let i = 0; i < computedColumnCount; i++) {
                    const currentHeight = columnHeights[i] ?? 0;
                    if (currentHeight < shortestHeight) {
                        shortestHeight = currentHeight;
                        shortestIndex = i;
                    }
                }

                const preferredHeight =
                    (columnHeights[preferredColumn] ?? 0) + height;

                const maxAllowedHeight = shortestHeight + height * 2.5;
                columnIndex =
                    preferredHeight <= maxAllowedHeight
                        ? preferredColumn
                        : shortestIndex;

                const columnHeight = columnHeights[columnIndex];
                if (columnHeight === undefined) {
                    return;
                }

                const top = columnHeight;
                columnHeights[columnIndex] = top + height + itemGap;

                const columnItemsList = columnItems[columnIndex];
                if (!columnItemsList) {
                    return;
                }
                columnItemsList.push(index);

                items[index] = {
                    columnIndex,
                    height,
                    left: columnIndex * (computedColumnWidth + columnGap),
                    top,
                    width: computedColumnWidth,
                };
                intervalTree.insert(top, top + height, index);
            },
            shortestColumn: () => {
                if (columnHeights.length > 1) {
                    return Math.min.apply(null, columnHeights);
                }
                return columnHeights[0] ?? 0;
            },
            size(): number {
                return intervalTree.size;
            },
            update: (updates: number[]) => {
                const columns: (number | undefined)[] = new Array(
                    computedColumnCount
                );
                let i = 0;
                let j = 0;
                const updateCount = updates.length;

                for (; i < updateCount - 1; i++) {
                    const currentIndex = updates[i];
                    if (typeof currentIndex !== "number") {
                        continue;
                    }

                    const item = items[currentIndex];
                    if (!item) {
                        continue;
                    }

                    const nextHeight = updates[++i];
                    if (typeof nextHeight !== "number") {
                        continue;
                    }

                    item.height = nextHeight;
                    intervalTree.remove(currentIndex);
                    intervalTree.insert(
                        item.top,
                        item.top + item.height,
                        currentIndex
                    );
                    const columnIndex = item.columnIndex;
                    const firstChangedIndex = columns[columnIndex];
                    columns[columnIndex] =
                        firstChangedIndex === undefined ||
                        currentIndex < firstChangedIndex
                            ? currentIndex
                            : firstChangedIndex;
                }

                for (i = 0; i < computedColumnCount; i++) {
                    const currentColumn = columns[i];
                    if (currentColumn === undefined) {
                        continue;
                    }

                    const itemsInColumn = columnItems[i];
                    if (!itemsInColumn) {
                        continue;
                    }

                    const startIndex = binarySearch(
                        itemsInColumn,
                        currentColumn
                    );
                    if (startIndex === -1) {
                        continue;
                    }

                    const currentItemIndex = itemsInColumn[startIndex];
                    if (typeof currentItemIndex !== "number") {
                        continue;
                    }

                    const startItem = items[currentItemIndex];
                    if (!startItem) {
                        continue;
                    }

                    const currentHeight = columnHeights[i];
                    if (typeof currentHeight !== "number") {
                        continue;
                    }

                    columnHeights[i] =
                        startItem.top + startItem.height + itemGap;

                    for (j = startIndex + 1; j < itemsInColumn.length; j++) {
                        const currentIndex = itemsInColumn[j];
                        if (typeof currentIndex !== "number") {
                            continue;
                        }

                        const item = items[currentIndex];
                        if (!item) {
                            continue;
                        }

                        const columnHeight = columnHeights[i];
                        if (typeof columnHeight !== "number") {
                            continue;
                        }

                        item.top = columnHeight;
                        columnHeights[i] = item.top + item.height + itemGap;
                        intervalTree.remove(currentIndex);
                        intervalTree.insert(
                            item.top,
                            item.top + item.height,
                            currentIndex
                        );
                    }
                }
            },
        };
    }

    const positionerRef = React.useRef<Positioner | null>(null);
    if (positionerRef.current === null) {
        positionerRef.current = initPositioner();
    }

    const prevDepsRef = React.useRef(deps);
    const opts = [
        width,
        columnWidth,
        columnGap,
        rowGap,
        columnCount,
        maxColumnCount,
        layout,
        aspectRatios,
        targetRowHeight,
        targetRowHeightTolerance,
        containerPadding,
        boxSpacing,
        maxNumRows,
        showWidows,
        fullWidthBreakoutRowCadence,
    ];
    const prevOptsRef = React.useRef(opts);
    const optsChanged = !opts.every(
        (item, i) => prevOptsRef.current[i] === item
    );

    if (
        optsChanged ||
        !deps.every((item, i) => prevDepsRef.current[i] === item)
    ) {
        const prevPositioner = positionerRef.current;
        const positioner = initPositioner();
        prevDepsRef.current = deps;
        prevOptsRef.current = opts;
        if (optsChanged && layout !== "justified") {
            const cacheSize = prevPositioner.size();
            for (let index = 0; index < cacheSize; index++) {
                const pos = prevPositioner.get(index);
                positioner.set(index, pos === undefined ? 0 : pos.height);
            }
        }
        positionerRef.current = positioner;
    }

    return positionerRef.current;
}

interface DebouncedWindowSizeOptions {
    containerRef: React.RefObject<RootElement | null>;
    defaultHeight?: number;
    defaultWidth?: number;
    delayMs?: number;
}

function readDocumentSize(
    defaultWidth: number,
    defaultHeight: number,
    element?: Element | null
) {
    if (element) {
        const documentElement = ownerDocument(element).documentElement;
        return {
            height: documentElement.clientHeight,
            width: documentElement.clientWidth,
        };
    }

    if (typeof globalThis.document === "undefined") {
        return { height: defaultHeight, width: defaultWidth };
    }

    return {
        height: globalThis.document.documentElement.clientHeight,
        width: globalThis.document.documentElement.clientWidth,
    };
}

function readScrollY(element?: Element | null) {
    if (element) {
        const doc = ownerDocument(element);
        return ownerWindow(element).scrollY ?? doc.documentElement.scrollTop;
    }

    if (typeof globalThis.window === "undefined") {
        return 0;
    }

    return (
        globalThis.window.scrollY ??
        globalThis.document?.documentElement.scrollTop ??
        0
    );
}

function useDebouncedWindowSize(options: DebouncedWindowSizeOptions) {
    const {
        containerRef,
        defaultWidth = 0,
        defaultHeight = 0,
        delayMs = DEBOUNCE_DELAY,
    } = options;

    const [size, setSize] = React.useState(() =>
        readDocumentSize(defaultWidth, defaultHeight)
    );
    const resizeTimeout = useTimeout();
    const setDebouncedSize = useStableCallback(
        (value: { height: number; width: number }) => {
            resizeTimeout.start(delayMs, () => setSize(value));
        }
    );

    React.useEffect(() => {
        const rootElement = containerRef.current;
        const rootWindow =
            rootElement === null ? globalThis.window : ownerWindow(rootElement);
        if (typeof rootWindow === "undefined") {
            return;
        }

        function onResize() {
            const container = containerRef.current;
            if (container) {
                setDebouncedSize({
                    height: ownerDocument(container).documentElement
                        .clientHeight,
                    width: container.offsetWidth,
                });
            } else {
                setDebouncedSize(readDocumentSize(defaultWidth, defaultHeight));
            }
        }

        rootWindow.addEventListener("resize", onResize, { passive: true });
        rootWindow.addEventListener("orientationchange", onResize);
        rootWindow.visualViewport?.addEventListener("resize", onResize);

        return () => {
            rootWindow.removeEventListener("resize", onResize);
            rootWindow.removeEventListener("orientationchange", onResize);
            rootWindow.visualViewport?.removeEventListener("resize", onResize);
            resizeTimeout.clear();
        };
    }, [
        containerRef,
        defaultHeight,
        defaultWidth,
        resizeTimeout,
        setDebouncedSize,
    ]);

    return size;
}

interface OnRafScheduleReturn<T extends unknown[]> {
    cancel: () => void;
    (...args: T): void;
}

function onRafSchedule<T extends unknown[]>(
    callback: (...args: T) => void
): OnRafScheduleReturn<T> {
    let lastArgs: T | null = null;
    let frameId: number | null = null;

    function onCallback(...args: T) {
        lastArgs = args;
        if (!frameId) {
            frameId = AnimationFrame.request(() => {
                frameId = null;
                if (lastArgs) {
                    callback(...lastArgs);
                }
            });
        }
    }

    onCallback.cancel = () => {
        if (!frameId) {
            return;
        }
        AnimationFrame.cancel(frameId);
        frameId = null;
    };

    return onCallback;
}

type MasonryResizeObserverFactory = (
    positioner: Positioner,
    onUpdate: () => void
) => ResizeObserver;

const NOOP_RESIZE_OBSERVER: ResizeObserver = {
    disconnect: () => {
        /* no-op: SSR */
    },
    observe: () => {
        /* no-op: SSR */
    },
    unobserve: () => {
        /* no-op: SSR */
    },
};

function createResizeObserverFactory(): MasonryResizeObserverFactory {
    if (typeof window === "undefined") {
        return () => NOOP_RESIZE_OBSERVER;
    }

    return onDeepMemo(
        [WeakMap],
        (positioner: Positioner, onUpdate: () => void) => {
            const updates: number[] = [];

            const update = onRafSchedule(() => {
                if (updates.length > 0) {
                    positioner.update(updates);
                    onUpdate();
                }
                updates.length = 0;
            });

            function onItemResize(target: HTMLElement) {
                const height = target.offsetHeight;
                if (height > 0) {
                    const index = Number(target.dataset.index);
                    if (!Number.isNaN(index)) {
                        const position = positioner.get(index);
                        if (
                            position !== undefined &&
                            height !== position.height
                        ) {
                            updates.push(index, height);
                        }
                    }
                }
                update();
            }

            const scheduledItemMap = new Map<
                number,
                OnRafScheduleReturn<[HTMLElement]>
            >();
            function onResizeObserver(entries: ResizeObserverEntry[]) {
                for (const entry of entries) {
                    const targetWindow = ownerWindow(entry.target);
                    if (!(entry.target instanceof targetWindow.HTMLElement)) {
                        continue;
                    }

                    const index = Number(entry.target.dataset.index);
                    if (Number.isNaN(index)) {
                        continue;
                    }

                    let handler = scheduledItemMap.get(index);
                    if (!handler) {
                        handler = onRafSchedule(onItemResize);
                        scheduledItemMap.set(index, handler);
                    }
                    handler(entry.target);
                }
            }

            const observer = new ResizeObserver(onResizeObserver);
            const disconnect = observer.disconnect.bind(observer);
            observer.disconnect = () => {
                disconnect();
                for (const [, scheduleItem] of scheduledItemMap) {
                    scheduleItem.cancel();
                }
            };

            return observer;
        }
    );
}

function useResizeObserver(positioner: Positioner) {
    const [, setLayoutVersion] = React.useState(0);
    const createResizeObserverRef =
        React.useRef<MasonryResizeObserverFactory | null>(null);
    if (createResizeObserverRef.current === null) {
        createResizeObserverRef.current = createResizeObserverFactory();
    }

    const resizeObserver = createResizeObserverRef.current(positioner, () =>
        setLayoutVersion((prev) => prev + 1)
    );

    React.useEffect(() => () => resizeObserver.disconnect(), [resizeObserver]);

    return resizeObserver;
}

function useScroller({
    offset = 0,
    fps = SCROLL_FPS,
}: {
    offset?: number;
    fps?: number;
} = {}) {
    const [scrollY, setScrollY] = useThrottle(readScrollY, {
        fps,
        leading: true,
    });

    const onScroll = useStableCallback(() => {
        setScrollY(readScrollY());
    });

    React.useEffect(() => {
        if (typeof globalThis.window === "undefined") {
            return;
        }
        globalThis.window.addEventListener("scroll", onScroll, {
            passive: true,
        });
        return () => {
            globalThis.window.removeEventListener("scroll", onScroll);
        };
    }, [onScroll]);

    const [isScrolling, setIsScrolling] = React.useState(false);
    const hasMountedRef = React.useRef(0);
    const scrollingTimeout = useTimeout();

    React.useEffect(() => {
        if (hasMountedRef.current === 0) {
            hasMountedRef.current = 1;
            return;
        }

        setIsScrolling(true);
        scrollingTimeout.start(40 + 1000 / fps, () => {
            setIsScrolling(false);
        });
        return scrollingTimeout.clear;
    }, [fps, scrollingTimeout]);

    return { isScrolling, scrollTop: Math.max(0, scrollY - offset) };
}

function useThrottle<State>(
    initialState: State | (() => State),
    options: {
        fps?: number;
        leading?: boolean;
    } = {}
): [State, React.Dispatch<React.SetStateAction<State>>] {
    const { fps = 30, leading = false } = options;
    const [state, setState] = React.useState(initialState);
    const latestSetState = React.useRef(setState);
    latestSetState.current = setState;

    const ms = 1000 / fps;
    const prevCountRef = React.useRef(0);
    const trailingTimeout = useTimeout();

    React.useEffect(
        () => () => {
            prevCountRef.current = 0;
            trailingTimeout.clear();
        },
        [trailingTimeout]
    );

    const throttledSetState = useStableCallback(
        (action: React.SetStateAction<State>) => {
            const perf =
                typeof performance === "undefined" ? Date : performance;
            const now = () => perf.now();
            const rightNow = now();
            const call = () => {
                prevCountRef.current = rightNow;
                trailingTimeout.clear();
                latestSetState.current(action);
            };
            const current = prevCountRef.current;

            if (leading && current === 0) {
                return call();
            }

            if (rightNow - current > ms) {
                if (current > 0) {
                    return call();
                }
                prevCountRef.current = rightNow;
            }

            trailingTimeout.clear();
            trailingTimeout.start(ms, () => {
                call();
                prevCountRef.current = 0;
            });
        }
    );

    return [state, throttledSetState];
}
// #endregion

// #region Component Definitions
const ROOT_NAME = "MasonryRoot";
const VIEWPORT_NAME = "MasonryViewport";
const ITEM_NAME = "MasonryItem";

const MASONRY_ERROR = {
    [ROOT_NAME]: `\`${ROOT_NAME}\` components must be within \`${ROOT_NAME}\``,
    [VIEWPORT_NAME]: `\`${VIEWPORT_NAME}\` components must be within \`${ROOT_NAME}\``,
    [ITEM_NAME]: `\`${ITEM_NAME}\` must be within \`${VIEWPORT_NAME}\``,
} as const;

type RootElement = React.ComponentRef<typeof Masonry>;
type ItemElement = React.ComponentRef<typeof MasonryItem>;
type MasonryChildProps = React.ComponentProps<"div"> & {
    "data-aspect-ratio"?: number;
    "data-index"?: number;
};
type MasonryChildElement = React.ReactElement<MasonryChildProps>;

function isMasonryChildElement(
    child: React.ReactNode
): child is MasonryChildElement {
    return React.isValidElement<MasonryChildProps>(child);
}

interface MasonryContextValue {
    columnWidth: number;
    isScrolling?: boolean;
    itemHeight: number;
    layout: "masonry" | "justified";
    onItemRegister: (index: number) => (node: ItemElement | null) => void;
    overscan: number;
    positioner: Positioner;
    resizeObserver?: ResizeObserver;
    scrollTop: number;
    windowHeight: number;
}

interface ItemRegisterCallbackCache {
    callbacks: React.RefCallback<ItemElement>[];
    positioner: Positioner;
    resizeObserver: ResizeObserver;
}

interface ItemRegistrationCache {
    nodes: (ItemElement | undefined)[];
    positioner: Positioner;
    resizeObserver: ResizeObserver;
}

const MasonryContext = React.createContext<MasonryContextValue | null>(null);

function useMasonryContext(name: keyof typeof MASONRY_ERROR) {
    const context = React.use(MasonryContext);
    if (!context) {
        throw new Error(MASONRY_ERROR[name]);
    }
    return context;
}

interface MasonryProps extends React.ComponentProps<"div"> {
    boxSpacing?: number | { horizontal: number; vertical: number };
    columnCount?: number;
    columnWidth?: number;
    containerPadding?:
        | number
        | { top: number; right: number; bottom: number; left: number };
    defaultHeight?: number;
    defaultWidth?: number;
    deps?: React.DependencyList;
    fallback?: React.ReactNode;
    fullWidthBreakoutRowCadence?: false | number;
    gap?: number | { column: number; row: number };
    itemHeight?: number;
    layout?: "masonry" | "justified";
    maxColumnCount?: number;
    maxNumRows?: number;
    overscan?: number;
    scrollFps?: number;
    showWidows?: boolean;
    targetRowHeight?: number;
    targetRowHeightTolerance?: number;
}

function parseGapValue(gap?: number | { column: number; row: number }) {
    const gapValue = typeof gap === "object" ? gap : { column: gap, row: gap };
    const columnGap = gapValue.column;
    const rowGap = gapValue.row;
    return { columnGap, rowGap };
}

function Masonry({
    boxSpacing,
    columnWidth = COLUMN_WIDTH,
    columnCount,
    containerPadding,
    maxColumnCount,
    fullWidthBreakoutRowCadence,
    gap = GAP,
    itemHeight = ITEM_HEIGHT,
    layout = "masonry",
    defaultWidth,
    defaultHeight,
    overscan = OVERSCAN,
    scrollFps = SCROLL_FPS,
    fallback,
    maxNumRows,
    showWidows,
    targetRowHeight,
    targetRowHeightTolerance,
    deps = [],
    children,
    style,
    ref,
    ...props
}: MasonryProps) {
    const { rowGap, columnGap } = parseGapValue(gap);
    const containerRef = React.useRef<RootElement | null>(null);
    const composedRef = useMergedRefs(ref, containerRef);

    const aspectRatios = React.useMemo(() => {
        if (layout !== "justified") {
            return;
        }
        return React.Children.toArray(children)
            .filter(isMasonryChildElement)
            .map((child) => {
                const ratio = Number(child.props["data-aspect-ratio"]);
                return Number.isNaN(ratio) || ratio <= 0 ? 1 : ratio;
            });
    }, [children, layout]);

    const size = useDebouncedWindowSize({
        containerRef,
        defaultHeight,
        defaultWidth,
        delayMs: DEBOUNCE_DELAY,
    });

    const [containerPosition, setContainerPosition] = React.useState({
        offset: 0,
        width: 0,
    });

    useIsoLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const offset =
            container.getBoundingClientRect().top + readScrollY(container);
        const width = container.offsetWidth;

        if (
            offset !== containerPosition.offset ||
            width !== containerPosition.width
        ) {
            setContainerPosition({
                offset,
                width,
            });
        }
    }, [containerPosition.offset, containerPosition.width]);

    const positioner = usePositioner(
        {
            aspectRatios,
            boxSpacing,
            columnCount,
            columnGap,
            columnWidth,
            containerPadding,
            fullWidthBreakoutRowCadence,
            layout,
            maxColumnCount,
            maxNumRows,
            rowGap,
            showWidows,
            targetRowHeight,
            targetRowHeightTolerance,
            width: containerPosition.width ?? size.width,
        },
        deps
    );
    const resizeObserver = useResizeObserver(positioner);
    const { scrollTop, isScrolling } = useScroller({
        fps: scrollFps,
        offset: containerPosition.offset,
    });
    const itemRegistrationCacheRef = React.useRef<ItemRegistrationCache | null>(
        null
    );
    if (
        itemRegistrationCacheRef.current === null ||
        itemRegistrationCacheRef.current.positioner !== positioner ||
        itemRegistrationCacheRef.current.resizeObserver !== resizeObserver
    ) {
        itemRegistrationCacheRef.current = {
            nodes: [],
            positioner,
            resizeObserver,
        };
    }

    const registerItemNode = useStableCallback(
        (index: number, node: ItemElement | null) => {
            if (!node) {
                return;
            }
            const itemRegistrationCache = itemRegistrationCacheRef.current;
            if (
                itemRegistrationCache?.nodes[index] === node &&
                positioner.get(index) !== undefined
            ) {
                return;
            }
            resizeObserver.observe(node);
            const currentRegistrationCache = itemRegistrationCacheRef.current;
            if (currentRegistrationCache) {
                currentRegistrationCache.nodes[index] = node;
            }
            if (positioner.get(index) === undefined) {
                positioner.set(index, node.offsetHeight);
            }
        }
    );

    const itemRegisterCallbacksRef =
        React.useRef<ItemRegisterCallbackCache | null>(null);
    if (
        itemRegisterCallbacksRef.current === null ||
        itemRegisterCallbacksRef.current.positioner !== positioner ||
        itemRegisterCallbacksRef.current.resizeObserver !== resizeObserver
    ) {
        itemRegisterCallbacksRef.current = {
            callbacks: [],
            positioner,
            resizeObserver,
        };
    }

    function onItemRegister(index: number) {
        const itemRegisterCallbacks =
            itemRegisterCallbacksRef.current?.callbacks;
        if (!itemRegisterCallbacks) {
            return (node: ItemElement | null) => {
                registerItemNode(index, node);
            };
        }
        const existingCallback = itemRegisterCallbacks[index];
        if (existingCallback) {
            return existingCallback;
        }

        const nextCallback: React.RefCallback<ItemElement> = (node) => {
            registerItemNode(index, node);
        };
        itemRegisterCallbacks[index] = nextCallback;
        return nextCallback;
    }

    return (
        <MasonryContext
            value={{
                columnWidth: positioner.columnWidth,
                isScrolling,
                itemHeight,
                layout,
                onItemRegister,
                overscan,
                positioner,
                resizeObserver,
                scrollTop,
                windowHeight: size.height,
            }}
        >
            <div
                {...props}
                data-slot="masonry"
                ref={composedRef}
                style={{
                    height: "100%",
                    position: "relative",
                    width: "100%",
                    ...style,
                }}
            >
                <MasonryViewport>{children}</MasonryViewport>
            </div>
        </MasonryContext>
    );
}

function MasonryViewport({
    children,
    style,
    ...props
}: React.ComponentProps<"div">) {
    const context = useMasonryContext(VIEWPORT_NAME);
    const [layoutVersion, setLayoutVersion] = React.useState(0);
    const layoutAnimationFrame = useAnimationFrame();

    const validChildren = React.Children.toArray(children).filter(
        isMasonryChildElement
    );

    const {
        columnWidth,
        isScrolling,
        itemHeight,
        layout,
        onItemRegister,
        overscan,
        positioner,
        scrollTop,
        windowHeight,
    } = context;

    const itemCount = validChildren.length;
    const shortestColumnSize = positioner.shortestColumn();
    const measuredCount = positioner.size();
    const overscanPixels = windowHeight * overscan;
    const rangeEnd = scrollTop + overscanPixels;
    const isLayoutOutdated =
        shortestColumnSize < rangeEnd && measuredCount < itemCount;

    const visibleItemStyle: React.CSSProperties = {
        position: "absolute",
        transform: isScrolling ? "translateZ(0)" : undefined,
        visibility: "visible",
        width: columnWidth,
        willChange: isScrolling ? "transform" : undefined,
        writingMode: "horizontal-tb",
    };

    const hiddenItemStyle: React.CSSProperties = {
        position: "absolute",
        visibility: "hidden",
        width: columnWidth,
        writingMode: "horizontal-tb",
        zIndex: -1000,
    };

    const positionedChildren = (() => {
        const result: React.ReactElement[] = [];
        const currentMeasuredCount = positioner.size();
        const currentShortestColumnSize = positioner.shortestColumn();
        const currentOverscanPixels = windowHeight * overscan;
        const currentRangeStart = Math.max(
            0,
            scrollTop - currentOverscanPixels / 2
        );
        const currentRangeEnd = scrollTop + currentOverscanPixels;

        positioner.range(
            currentRangeStart,
            currentRangeEnd,
            (index, left, top) => {
                const child = validChildren[index];
                if (!child) {
                    return;
                }
                const pos = positioner.get(index);
                result.push(
                    React.cloneElement(child, {
                        "data-index": index,
                        key: child.key ?? index,
                        ref: onItemRegister(index),
                        style: {
                            ...visibleItemStyle,
                            height:
                                layout === "justified"
                                    ? pos?.height
                                    : undefined,
                            left,
                            top,
                            width: pos?.width ?? columnWidth,
                            ...child.props.style,
                        },
                    })
                );
            }
        );

        const layoutOutdated =
            currentShortestColumnSize < currentRangeEnd &&
            currentMeasuredCount < itemCount;

        if (layoutOutdated) {
            const batchSize = Math.min(
                itemCount - currentMeasuredCount,
                Math.ceil(
                    ((scrollTop +
                        currentOverscanPixels -
                        currentShortestColumnSize) /
                        itemHeight) *
                        positioner.columnCount
                )
            );

            if (batchSize > 0) {
                const end = Math.min(
                    itemCount,
                    currentMeasuredCount + batchSize
                );
                for (let index = currentMeasuredCount; index < end; index++) {
                    const child = validChildren[index];
                    if (!child) {
                        continue;
                    }
                    result.push(
                        React.cloneElement(child, {
                            "data-index": index,
                            key: child.key ?? index,
                            ref: onItemRegister(index),
                            style: { ...hiddenItemStyle, ...child.props.style },
                        })
                    );
                }
            }
        }

        return result;
    })();

    React.useEffect(() => {
        if (!isLayoutOutdated) {
            return;
        }
        layoutAnimationFrame.request(() => {
            setLayoutVersion((v) => v + 1);
        });
        return layoutAnimationFrame.cancel;
    }, [isLayoutOutdated, layoutAnimationFrame]);

    const estimateHeight = useValueAsRef(positioner.estimateHeight);

    const estimatedHeight = (() => {
        const measuredHeight = estimateHeight.current(
            measuredCount,
            itemHeight
        );
        if (measuredCount === itemCount) {
            return measuredHeight;
        }
        const remainingItems = itemCount - measuredCount;
        const estimatedRemainingHeight = Math.ceil(
            (remainingItems / positioner.columnCount) * itemHeight
        );
        return Math.ceil(measuredHeight + estimatedRemainingHeight);
    })();

    return (
        <div
            {...props}
            data-version={layoutVersion}
            style={{
                height: estimatedHeight,
                maxHeight: estimatedHeight,
                maxWidth: "100%",
                pointerEvents: isScrolling ? ("none" as const) : undefined,
                position: "relative" as const,
                width: "100%",
                willChange: isScrolling ? "contents" : undefined,
                ...style,
            }}
        >
            {positionedChildren}
        </div>
    );
}

function MasonryItem(props: React.ComponentProps<"div">) {
    return <div data-slot="masonry-item" {...props} />;
}
// #endregion

export { Masonry, MasonryItem };
