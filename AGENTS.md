# What is this project?

Cache is a modern well-crafted web application meant to unify user bookmarks across all mainstream platforms, meant for power-users.

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tech stack

- runtime & package manager: Node.js >= 24, Bun, read Bun API docs in `node_modules/bun-types/docs/**.mdx` if necessary.
- framework: Next.js 16 (App Router)
- ui: React 19; COSS (Base-UI); lucide-react; motion (aka framer-motion);
- styling: Tailwind CSS 4
- validation: zod
- auth: better-auth with better-auth/stripe (subscriptions)
- payments: Stripe
- tooling: TypeScript 6 (strict typing, never use `any`), Biome via Ultracite

## Logging and error handling

- Logging lives at `lib/logs/console/logger.ts`:
  - `createLogger(module)` returns a scoped logger with `.debug/.info/.warn/.error` and a `.time()` helper for spans.
- Named errors live at `lib/error.ts`:
  - `NamedError.create("SomeDomainError", z.object({...}))` creates a typed error class with runtime-validated `data` and a stable `name`.
  - Use these in services and actions to propagate domain failures with structured metadata (e.g., `{ operation, message, ... }`).

## On development

- Minimize any low-value prose. Offer nuanced, factual, and accurate solutions with brilliant critical reasoning. Suggest solutions or alternatives I didn’t think about and anticipate my needs.
- When the user request is suggesting an approach that is not ideal or wouldn't work, you must reject it and offer alternatives or different perspectives on the problem at hand. Reframe problems and perspectives whenever adequate in order to reach the most optimal answer. Break them down into smaller, logical steps from first principles.
- Consider new technologies and contrarian ideas, not just conventional wisdom.
- If you do not know the answer or think there might not be a correct answer, say so instead of guessing.
- Learn from existing code: Study and plan before implementing. Identify recurring patterns and design influences in the code. Always keep rules or constraints of the task in mind.
- Always trace how parts connect, such as data flow between functions, stage dependencies, or what module owns what.
- Do not jump to conclusions; Question your assumptions so that you can achieve the most optimal solutions.

## On coding

- Follow the rationale that each function should have a single, named responsibility. Keep it small enough to reason about in isolation such that it is understandable and verifiable as a logical unit (self-contained). If you need to trace external state to understand it, it's too large or too coupled.
- Strive for writing fully functional, bug-free code by using best practices and minimizing room for error.
- Avoid unnecessary code indirection unless an abstraction for DRY compliance is necessary.
- Composition over inheritance: Prefer dependency injection.
- Handle errors at their appropriate scope. Never silently swallow exceptions.
- Leverage ES6+ features for cleaner code (default parameters, arrow functions, and object destructuring).
- Avoid using `any` or casting types at all costs as it indicates wrong assumptions or bad implementation.
