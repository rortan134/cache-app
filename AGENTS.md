# Project overview

Cache is a modern well-crafted personal knowledge web application tool that unifies user bookmarks across all mainstream platforms into a single searchable and actionable library: you can search it in plain English, organize results into collections in one step, synthesize what you've gathered, and pipe it into the tools you already think in, like Notion. It starts where the algorithmic feed ends—at the moment you hit save—treating that decision as a signal worth honoring, and building everything around the one thing bookmark tools have historically failed at: making saved content retrievable and useful when it actually matters.

This document provides essential information for working in this repository.

## On development

Cache App has a zero technical debt policy. Do it right the first time. A problem solved in design costs less than one solved in implementation, which costs less than one solved in production. The cost of fixing problems grows exponentially over time.

Minimize any low-value prose. Offer nuanced, factual, and accurate solutions with brilliant critical reasoning. Suggest solutions or alternatives I didn’t think about and anticipate my needs.

When the user request is suggesting an approach that is not ideal or wouldn't work, you must reject it and offer alternatives or different perspectives on the problem at hand. Reframe problems and perspectives whenever adequate in order to reach the most optimal answer. Break them down into smaller, logical steps from first principles.

Consider new technologies and contrarian ideas, not just conventional wisdom.

If you do not know the answer or think there might not be a correct answer, say so instead of guessing.

Learn from existing code: Study and plan before implementing. Identify recurring patterns and design influences in the code. Keep rules or constraints of the task in mind.

Trace how parts connect, such as data flow between functions, stage dependencies, or what module owns what.

If a tradeoff is required, choose correctness and robustness over short-term convenience or shortcuts.

## On coding

It is not about formatting or syntax. Linters handle that. It is about how to think, how to make decisions, and what to value when building software.

Fight entropy. Leave the codebase better than you found it.

Make minimal, surgical changes.

You read the implementation, not just the signature.

Simple and elegant systems are easier to design correctly, more efficient in execution, and more reliable. That simplicity requires hard work and discipline.

Simplicity is not the first attempt. It is the hardest revision. It takes thought, multiple passes, and the willingness to throw work away. The goal is to find the idea that solves multiple problems at once.

Follow the rationale that each function should have a single, named responsibility. Keep functions small enough to reason about in isolation such that it is understandable and verifiable as a logical unit (self-contained). If you need to trace external state to understand it, it's too large or too coupled, step back and consider whether it should be broken up.

Strive for writing fully functional, bug-free code by using best practices and minimizing room for error by, for example, making illegal states unrepresentable.

Avoid unnecessary code indirection unless an abstraction for DRY compliance is necessary. Duplicate logic across multiple files is a code smell and should be avoided. Extracting a className string into a constant just because it is used twice is not justified, that is code indirection.

Composition over inheritance: Prefer dependency injection.

Handle errors at the appropriate scopes. Never silently swallow exceptions. If you think an error cannot happen, assert that assumption explicitly.

Never compromise type safety: Avoid using `any`, no `!` (non-null assertion), or casting types `as Type` at all costs as it indicates wrong assumptions or bad implementation.

Declare variables at the smallest possible scope. Minimize the number of variables in play at any point. This reduces the probability of using the wrong variable and makes code easier to reason about. Calculate or check variables close to where they are used. Do not introduce variables before they are needed or leave them around when they are not.

Plugin architectures allow for extensibility and isolation; most functionality should live in plugins, not the core, enabling parallel development and future-proofing.

Minimize risk by anticipating what’s most likely to fail (platforms, language changes, hardware, people) and insulating your system from those points of failure.

Great names capture what a thing is or does. Append qualifiers to names. Units, bounds, and modifiers come at the end. This groups related variables together and makes scanning easier.

Avoid else statements. Prefer early returns.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

## On documentation

Document the why, not the what: The code shows what it does. Documentation should explain why it exists, why it works this way, and what could go wrong.

Document what **not** to do: Warn against common mistakes when a misuse would be easy and costly.

Document design choices: When you choose between reasonable alternatives, explain  the reasoning in a sentence. e.g. "The package X uses functional options Y rather than a config struct because Z" or "We return a X rather than failing on the Y because Z"

The depth of documentation should match complexity. A simple getter needs one line. A distributed algorithm needs paragraphs.

When to include specific details:

  Parameters: Document when the purpose is not obvious from the name and type, or when there are constraints like must be positive.

  Return values: Explain when return patterns are subtle or when multiple success states exist. For functions that return a value plus an error, document what value returns on failure.

  Error conditions: List specific errors only when callers need to handle them differently.

  Concurrency: Document when a function or type is safe or unsafe for concurrent use.

  Performance: Mention non-obvious characteristics that affect usage decisions.

  Context: Document context behavior only if it is non-standard.

## On React components

Prefer a headless, multi-part compound component composition pattern where a single logical widget is decomposed into many small, focused parts that communicate through shared internal state rather than props drilling. Every component should use a common, composable interface, making them predictable. Composable components naturally fit with one another. Each component is built to match the others, keeping the UI consistent. Please see `vercel-composition-patterns` for more.

You mount a root controller (e.g. ‎`Combobox.Root` / ‎`ComboboxRoot`) that owns centralized state, behavior and semantics (value, inputValue, items, open, highlight, async status) and exposes it via context to leaf parts like ‎`Input`, ‎`InputGroup`, ‎`Trigger`, ‎`Icon`, ‎`List`, ‎`Item`, ‎`ItemIndicator`, ‎`Chips`, ‎`Group`, ‎`Portal`, ‎`Positioner`, ‎`Popup`, ‎`Status`, and ‎`Empty` exported as many headless part components bound together by the shared store/context layer

Leaf components may also layer on local responsibilities that are intrinsically per-item tightly scoped to how one item registers itself with the store and translates global state.

Use the shadow DOM-safe utilities for DOM traversal and event targeting: contains, getTarget, and activeElement. Use the owner utilities ownerDocument and ownerWindow instead of global document/window lookups when the code is tied to a DOM node, including realm-sensitive checks such as instanceof.

Avoid duplicating logic where necessary. If two components can share logic (such as event handlers), define the logic/handlers in the parent and share it through a context to the child; use the existing context if it exists.

## On this project

Before adding a new utility, check if a similar one exists in the `lib/` directory or nearby module scope as utils.

### Tech stack

runtime & package manager: Node.js 24.x, Bun, read Bun API docs in `node_modules/bun-types/docs/**.mdx` if necessary.

framework: Next.js 16 (App Router, This is NOT the Next.js you know, This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs` before writing relevant code. Heed deprecation notices.)

UI: React 19, Base-UI (@base-ui/react), lucide-react

React Compiler: babel-plugin-react-compiler is enabled. It automatically memoizes components and values. Do not add manual `useMemo` or `useCallback`; they add noise without benefit and can interfere with compiler optimization.

Styling: Tailwind CSS 4

Validation: zod v4 schemas

Database: PostgreSQL via Prisma ORM v7

Auth: better-auth with better-auth/stripe (Stripe subscriptions)

Tooling: TypeScript v6 (strict typing), Biome via Ultracite (run via `bun lint` or `bun lint:fix` for writing)

### Procedure module patterns (server actions + services)

We organize Next.js Server Actions as thin adapters in `lib/{module}/actions.ts` files that handle input validation, auth and session checks, error normalization, caching/revalidation and rate limiting. These actions call pure service functions which contain all business logic and database/external-API calls. Services never depend on Next.js; they operate on validated data and return domain objects or typed results.
Actions are the only networking boundary: they parse/validate inputs, guard with user context, translate service results to serialized responses, and decide side effects like `revalidatePath()`, Stripe operations, sending emails, and more.

### Logging and error handling

Instrument critical paths. Log errors with context. Emit metrics for failure rates. Trace requests across service boundaries.

Logging lives at `lib/common/logs/console/logger.ts`:

  `createLogger(module)` returns a scoped logger with `.debug/.info/.warn/.error` and a `.time()` helper for spans.

Named error module lives at `lib/common/error.ts`:

  `NamedError.create("SomeDomainError", z.object({...}))` creates a typed error class with runtime-validated `data` and a stable `name`.

Use these in services and actions to propagate domain failures with structured metadata (e.g., `{ operation, message, ... }`).
