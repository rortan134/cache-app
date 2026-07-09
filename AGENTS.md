# AGENTS.md

## Project overview

[Cache](https://www.cachd.app) is a modern well-crafted purpose-built personal bookmark knowledge web application tool that unifies user bookmarks across all mainstream platforms into a single, searchable, actionable library. Read [README.md](README.md) for more.

## On development

Cache has a zero technical debt policy. Do it right the first time: the design that lands in the codebase should be the correct one. A problem solved in design costs less than one solved in implementation, which costs less than one solved in production. The cost of fixing problems grows exponentially over time. "Right the first time" describes the landed output, not the exploration that produced it — see simplicity below.

Minimize low-value prose. Offer nuanced, factual, and accurate solutions with brilliant critical reasoning. Suggest solutions or alternatives I didn’t think about and anticipate my needs.

When the user request is suggesting an approach that is not ideal or wouldn't work, you must reject it and offer alternatives or different perspectives on the problem at hand. Reframe problems and perspectives whenever adequate in order to reach the most optimal answer. Break them down into smaller, logical steps from first principles.

Consider new technologies and contrarian ideas, not just conventional wisdom.

If you do not know the answer or think there might not be a correct answer, say so instead of guessing.

Learn from existing code: Study and plan before implementing. Identify recurring patterns and design influences in the code. Keep rules or constraints of the task in mind.

Trace how parts connect, such as data flow between functions, stage dependencies, or what module owns what.

If a tradeoff is required, choose correctness and robustness over short-term convenience or shortcuts.

Define success criteria. Loop until verified.

It is not about formatting or syntax. Linters handle that. It is about how to think, how to make decisions, and what to value when building software.

Fight entropy. Leave the codebase better than you found it.

Make minimal, surgical changes.

Read the full implementation, not just the signature.

Simple and elegant systems are easier to design correctly, more efficient in execution, and more reliable. That simplicity requires hard work and discipline.

Simplicity is not the first attempt. It is the hardest revision. It takes thought, multiple passes, and the willingness to throw work away. The goal is to find the idea that solves multiple problems at once.

Follow the rationale that each function should have a single, named responsibility. Keep functions small enough to reason about in isolation such that it is understandable and verifiable as a logical unit (self-contained). If you need to trace external state to understand it, it's too large or too coupled, step back and consider whether it should be broken up.

Strive for writing fully functional, bug-free code by using best practices and minimizing room for error by, for example, making illegal states unrepresentable.

Avoid unnecessary code indirection unless an abstraction for DRY compliance is necessary. Duplicate logic across multiple files is a code smell and should be avoided. Extracting a className string into a constant just because it is used twice is not justified, that is code indirection.

Follow YAGNI principles, and prefer one-liner solutions.

Composition over inheritance: Prefer dependency injection.

Handle errors at the appropriate scopes. Never silently swallow exceptions. If you think an error cannot happen, assert that assumption explicitly.

Never compromise type safety: Avoid using `any`, no `!` (non-null assertion), or casting types `as Type` at all costs as it indicates wrong assumptions or bad implementation.

Declare variables at the smallest possible scope. Minimize the number of variables in play at any point. This reduces the probability of using the wrong variable and makes code easier to reason about. Calculate or check variables close to where they are used. Do not introduce variables before they are needed or leave them around when they are not.

Plugin architectures allow for extensibility and isolation; most functionality should live in plugins, not the core, enabling parallel development and future-proofing. Apply the plugin rule only to features whose pluggability is itself a current requirement (sync adapters, export formats, AI providers). YAGNI governs speculative features — do not extract a plugin boundary for a single implementation.

Minimize risk by anticipating what’s most likely to fail (platforms, language changes, hardware, people) and insulating your system from those points of failure.

Great names capture what a thing is or does. Append qualifiers to names. Units, bounds, and modifiers come at the end. This groups related variables together and makes scanning easier.

Reduce total variable count by inlining when a value is only used once.

Constants Are Module-Level and UPPER_SNAKE_CASE. Physics constants, selectors, and thresholds are declared at the top of the file, never inside the component.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

## On React components

Never show the empty state during the loading state. Loading indicators (skeletons, spinners) and empty states are mutually exclusive — guard empty state checks with `isLoading` so the loading UI renders first, and the empty state only appears after loading completes with zero results.

Always build React components following full `vercel-composition-patterns` and `vercel-react-best-practices` rules.

Every component should be co-located into a single file with its parts, and should use a common, composable interface, making them predictable.

Use the `useTimeout` utility from `@base-ui/utils/useTimeout` instead of `window.setTimeout`, and `useAnimationFrame` from `@base-ui/utils/useAnimationFrame` instead of `requestAnimationFrame`.

Use the `useStableCallback` utility from `@base-ui/utils/useStableCallback` instead of `React.useCallback` whenever the function is passed into an effect, an event handler, or any other long-lived closure — `useStableCallback` guarantees a stable identity without re-running on every render, which the React Compiler does not do for free. The utility cannot be used to memoize functions that are called directly in the body of a component (during render); in those cases the React Compiler memoizes the value automatically, so no manual hook is needed.

Use the `useIsoLayoutEffect` utility from `@base-ui/utils/useIsoLayoutEffect` instead of `React.useLayoutEffect`.

Use the shadow DOM-safe utilities for DOM traversal and event targeting: `contains`, `getTarget`, and `activeElement`. Use the owner utilities `ownerDocument` and `ownerWindow` instead of global `document`/`window` lookups when the code is tied to a DOM node, including realm-sensitive checks such as `instanceof`.

Avoid duplicating logic where necessary: If two components can share logic (such as event handlers), define the logic/handlers in the parent and share it through a context to the child; use the existing context if it exists.

### File-Level Definition Order

Make sure every component file follows the same vertical stack. Deviations are rare: a stateless pure helper may live above the component only when it is consumed by module-level stateless objects (step #4); helpers that close over component internals or any per-render value live below the types at the bottom (steps #9–#10).

1. Imports
2. Module-level constants (UPPER_SNAKE_CASE)
3. Module-level types/interfaces needed by the component (e.g., TouchScrollState)
4. Module-level stateless objects (e.g., stateAttributesMapping)
5. Module-level pure helper functions used by #4 (if any)
6. Component definition (export const Component = forwardRef(function Component(...)))
7. Prop / State interfaces (export interface ComponentProps ...)
8. Namespace block (export namespace Component { ... })
9. Private helper functions used only by the component
10. Private sub-components used only by the component

### Component Body: Internal Ordering

Inside the component function, hooks and logic should be grouped in a predictable sequence:

```ts
export const DrawerPopup = (
  componentProps: DrawerPopup.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) => {
  // 1. Destructure render/className/style first, then ...elementProps
  const { render, className, style, finalFocus, initialFocus, ...elementProps } = componentProps;

  // 2. Context reads
  const { store } = useDialogRootContext();
  const { swipeDirection, ... } = useDrawerRootContext();

  // 3. Store state reads (batched together)
  const descriptionElementId = store.useState('descriptionElementId');
  const modal = store.useState('modal');
  const open = store.useState('open');
  // ...

  // 4. Other hooks that don't depend on #5-#7
  useDialogPortalContext();

  // 5. Derived values
  const nestedDrawerOpen = nestedOpenDrawerCount > 0;

  // 6. Local useState
  const [popupHeight, setPopupHeight] = React.useState(0);

  // 7. Refs
  const popupHeightRef = React.useRef(0);

  // 8. Handlers (useStableCallback / useCallback)
  const measureHeight = useStableCallback(() => { ... });
  const handleOpenChange = useStableCallback((nextOpen) => { ... });

  // 9. Effects
  useIsoLayoutEffect(() => { ... }, [...]);
  React.useEffect(() => { ... }, [...]);

  // 10. Build the state object for useRenderElement
  const state: DrawerPopupState = { open, nested, ... };

  // 11. Compute final props / styles
  let popupHeightCssVarValue: string | undefined;
  if (popupHeight && !shouldUseAutoHeight) {
    popupHeightCssVarValue = `${popupHeight}px`;
  }

  // 12. Render
  const element = useRenderElement('div', componentProps, { ... });
  return <FloatingFocusManager ...>{element}</FloatingFocusManager>;
};
```

### Boolean Naming Conventions

Boolean variables follow a rigid prefix convention. Scanning the files:

| Prefix           | Example                                                | Context                      |
| ---------------- | ------------------------------------------------------ | ---------------------------- |
| is               | isVerticalScrollAxis, isNestedDrawerOpenRef            | State or derived condition   |
| has              | hasNestedDrawer, hasCrossAxisScrollableContent         | Possession                   |
| should           | shouldUseAutoHeight, shouldApplySnapPoints, shouldDamp | Conditional behavior         |
| can              | canSwipeFromScrollEdgeOnMove, canStart                 | Capability / permission      |
| allow            | allowSwipe, allowTouchMove                             | Permission in touch handling |
| disable / enable | disablePointerDismissal, enabled                       | Feature flags                |

### Ref Naming

Refs are initialized to their semantic empty state (false, 0, null, ''), never undefined unless the type requires it.

| Pattern               | Example                            | Meaning                                 |
| --------------------- | ---------------------------------- | --------------------------------------- |
| xRef                  | popupHeightRef, lastPointerTypeRef | Plain ref holding a value               |
| xRef.current = fn     | resetSwipeRef.current = resetSwipe | Callback ref pattern                    |
| isNestedDrawerOpenRef | isNestedDrawerOpenRef              | Boolean ref for stale-closure avoidance |

## On writing code documentation

Document the why, not the what: The code shows what it does. Documentation should explain why it exists, why it works this way, and what could go wrong. Your job is to produce clear, accurate, and consistent content that helps developers succeed on this codebase.

Document what **not** to do: Warn against common mistakes when a misuse would be easy and costly. No `====` separators.

Document design choices: When you choose between reasonable alternatives, explain  the reasoning in a sentence. e.g. "The package X uses functional options Y rather than a config struct because Z" or "We return a X rather than failing on the Y because Z"

The depth of documentation should match complexity. A simple getter needs one line. A distributed algorithm needs paragraphs.

When to include specific details:

  Parameters: Document when the purpose is not obvious from the name and type, or when there are constraints like must be positive.

  Return values: Explain when return patterns are subtle or when multiple success states exist. For functions that return a value plus an error, document what value returns on failure.

  Error conditions: List specific errors only when callers need to handle them differently.

  Concurrency: Document when a function or type is safe or unsafe for concurrent use.

  Performance: Mention non-obvious characteristics that affect usage decisions.

  Context: Document context behavior only if it is non-standard.

## On this project

This is a shared codebase. Multiple agents may be working concurrently. Never revert, restore, or overwrite files you did not personally modify — `git status` showing files you never touched is a signal that someone else is working, not that your tooling misbehaved. Scope every `git restore`, `git checkout`, `git stash`, and destructive file operation strictly to the files you changed. When in doubt, leave it alone.

Before adding a new utility, check if a similar one exists in the `lib/common` directory or nearby module scope as utils.

Anchor design decisions on the user's primary task or focus, to make sure the user can complete those tasks easily, not overwhelmed by unrelated UI clutter or user flows. Our UI should help users complete their tasks, not hinder them.

### Tech stack

Runtime & Package Manager: Node.js 24.x, Bun, read Bun API docs in `node_modules/bun-types/docs/**.mdx` if necessary.
Framework: Next.js 16 (App Router)
UI: React 19, Base-UI ([@base-ui/react](https://base-ui.com/llms.txt), @base-ui/utils), [motion](https://motion.dev) for animations, and lucide-react icons
React Compiler: `babel-plugin-react-compiler` is enabled. It automatically memoizes components and values, including render-time derived values. Do not add manual `useMemo` or `useCallback`; they add noise without benefit and can interfere with compiler optimization.
Styling: Tailwind CSS 4
Rich Text: [Lexical](https://lexical.dev) for notes editing
Internationalization: [gt-next](https://gt-next.vercel.app) for i18n
Validation: zod v4 schemas
Database: PostgreSQL via Prisma ORM v7
AI: [Vercel AI SDK](https://sdk.vercel.ai) + [Workflow](https://workflow.vercel.ai) for durable AI orchestration
Auth: [better-auth](https://better-auth.com/llms.txt) with better-auth/stripe (Stripe subscriptions)
Email: [Resend](https://resend.com)
Security: [Arcjet](https://arcjet.com) for rate limiting and bot protection
Tooling: TypeScript v6 (strict typing), Biome via Ultracite (run via `bun lint` or `bun lint:fix` for writing)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

### Documentation lookups with Context7

When you need up-to-date API docs, usage examples, or migration guides for any library or framework (especially those in the tech stack above), use the Context7 tools (`context7_resolve-library-id` then `context7_query-docs`). They fetch current documentation and code examples instead of relying on potentially stale training data. Call these whenever a question involves a specific library version, a new API, or a pattern you're uncertain about.

### Server Actions / Service module pattern

We organize and co-locate Next.js Server Actions as thin adapters in `lib/{module}/actions.ts` files that handle input/output validation, auth/session and privilege checks, error normalization, caching/revalidation and rate limiting. These actions call pure service functions which contain all business logic and database/external-API calls. Services never depend on the framework; they operate on validated data and return domain objects/typed results, and can be used independently either for other modules, as side effects, or pure server components.

Actions are the only networking boundary: they parse/validate inputs, guard with user context, translate service results to serialized responses, and decide application-specific side effects, like `revalidatePath()`. Behind the scenes, actions use the `POST` method. On the client, an action is consumed in one of two ways: as a read, by wrapping it in a small fetcher function passed to [swr](https://swr.vercel.app/llms.txt) (SWR calls the function locally); or as a mutation, by calling it directly from an event handler or form action. Either way the action is imported and invoked as an ordinary async function — the type signature of the export is the type of the call site, so requests and responses are fully inferred without an intermediate schema. Actions should return only the necessary data that will be used atomically, and not entire objects.

### Logging and error handling pattern

Instrument critical paths. Log errors with context. Emit metrics for failure rates. Trace requests across service boundaries.

Logging lives at `lib/common/logs/console/logger.ts`:
  `createLogger(module)` returns a scoped logger with `.debug/.info/.warn/.error` and a `.time()` helper for spans.

Named error module lives at `lib/common/error.ts`:
  `NamedError.create("SomeDomainError", z.object({...}))` creates a typed error class with runtime-validated `data` and a stable `name`.

Use these in services and actions to propagate domain failures with structured metadata (e.g., `{ operation, message, ... }`).

### Data model

The data model can be found at `prisma/schema.prisma`

### Papercuts

Anytime you hit friction during a task — a dead-end tool call, a broken link, misleading docs, a flaky command, missing context — log it instead of silently working around it:
`./bin/papercuts "what went wrong and where..."`
Keep going with your task afterward. Don't stop to fix it unless asked to.
