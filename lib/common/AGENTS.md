# Common Utilities (`lib/common`)

Foundational utilities and shared logic for the Cache application. This directory serves as the unified home for domain-agnostic tools, moved here to ensure consistency across the codebase.

## Directory Structure

### 🛠 Core Infrastructure

| Module | Description |
| :--- | :--- |
| [`logs/`](./logs) | Scoped logging system with environment-aware formatting and colorization. Includes a standalone `sanitize.ts` utility for sensitive data redaction. |
| [`error.ts`](./error.ts) | Structured `NamedError` system for defining runtime-validated, domain-specific errors via Zod. |
| [`cn.ts`](./cn.ts) | Tailwind class merging utility (`clsx` + `twMerge`). |
| [`constants.ts`](./constants.ts) | App-wide static configuration including locales, branding, and founding dates. |
| [`environment.ts`](./environment.ts) | Browser/Client feature detection and environment state checks. |
| [`dom.ts`](./dom.ts) | SSR-safe DOM access and browser detection helpers. |

### 📊 Data & Logic Utilities

| Module | Description |
| :--- | :--- |
| [`objects.ts`](./objects.ts) | Type-safe object manipulation (omit, pick, deep-access). |
| [`strings.ts`](./strings.ts) | String formatting, slugification, and incremented naming logic. |
| [`types.ts`](./types.ts) | Shared TypeScript primitives and utility types. |
| [`weak-cache.ts`](./weak-cache.ts) | Memory-efficient caching using `WeakMap` for record-based storage. |
| [`memoize.ts`](./memoize.ts) | Generic function memoization. |
| [`promise-like.ts`](./promise-like.ts) | Type guards for Promise-like objects. |
| [`retry.ts`](./retry.ts) | Configurable retry logic with exponential backoff support. |
| [`abort.ts`](./abort.ts) | Helpers for `AbortController` and signal management. |

### 🌐 Network & Integration

| Module | Description |
| :--- | :--- |
| [`url.ts`](./url.ts) | URL normalization, sanitization, and parsing logic. |
| [`get-ip.ts`](./get-ip.ts) | **Server-only**: Extracts client IP via Next.js headers (Arcjet compatible). |
| [`cobalt.ts`](./cobalt.ts) | **Server-only**: Integration with Cobalt API for media download resolution. |

### 🎨 Media & Design

| Module | Description |
| :--- | :--- |
| [`colors.ts`](./colors.ts) | Color space conversions (Hex/HSL/RGB) and contrast logic. |
| [`image-colors.ts`](./image-colors.ts) | **Client-only**: Palette extraction from images using `node-vibrant`. |
| [`aspect-ratio.ts`](./aspect-ratio.ts) | Calculations for media and layout aspect ratios. |
| [`blob.ts`](./blob.ts) | Utilities for Blob/File processing and Data URL conversion. |
| [`file.ts`](./file.ts) | File extension handling and size formatting. |

### 💾 Storage

| Module | Description |
| :--- | :--- |
| [`storage.ts`](./storage.ts) | Type-safe wrappers for `localStorage` and `sessionStorage`. |
