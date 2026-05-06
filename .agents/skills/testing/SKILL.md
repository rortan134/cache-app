---
title: Testing
description: Testing standards and patterns
---

## Why we test

Tests exist to give confidence. Confidence to ship changes quickly, confidence that refactoring will not break production, confidence that the system behaves as expected. A test suite with 90 percent coverage that misses critical edge cases is less valuable than one with 60 percent coverage that catches real bugs.

We prioritize quality over quantity. A single well-designed test that validates complex business logic is worth more than a dozen tests that exercise trivial code paths. When writing tests, ask what could go wrong in production that this test would catch.

## What to test

Invest testing effort where bugs would hurt most.

**High value targets:** Business logic with complex conditionals, error handling paths, concurrent code with race potential, security sensitive operations, data transformations that could silently corrupt.

**Lower value targets:** Simple getters and setters, straightforward pass-through functions, code that delegates to well-tested libraries.

**Skip entirely:** Tests that verify the programming language works.

Ask what bug this test would catch that the compiler, a code review, or a more meaningful test would not.

### Testing observability

Do not verify every log line or metric increment. Test metrics that drive alerts or SLOs. Test that error conditions produce the logs operators need for debugging.

```ts
import { test, expect } from "bun:test";

test("rate limiter emits rejection metric", () => {
    const collector = new TestMetricCollector();
    const limiter = new RateLimiter({ limit: 1 }, collector);

    limiter.allow();
    limiter.allow();

    expect(collector.count("rate_limit_rejected_total")).toBe(1);
});
```

## Test organization

Unit Tests live alongside the code they test. A file `lib.ts` has its tests in `lib.test.ts` in the same directory.

For integration tests that require substantial setup or external dependencies, create an `integration/` subdirectory when it improves clarity, and for end-to-end testing `e2e/`.

## Running tests

During development, run tests for the package you are working on:

Before pushing, run the full test suite:

```bash
bun test
```
