---
name: benchmarking-best-practices
description: Different ways of writing similar logic (e.g., for loops vs. forEach) can have significant performance differences. This covers essential concepts and best practices to ensure your benchmarks measure actual performance characteristics rather than optimization artifacts.
---

Creating accurate and meaningful benchmarks requires careful attention to how modern JavaScript engines optimize code.

## General Principles

- Benchmark before optimizing: Always measure code performance with real benchmarks before making optimization decisions[2].
- Profile in production or realistic environments: Benchmark and profile code in the actual environment it will run (e.g., Deno, Node, Bun) to account for engine-specific optimizations and avoid misleading micro-benchmarks[2].
- Focus on bottlenecks: Optimize the code sections that consume the most runtime, not just any slow-looking code[2].
- Prioritize readability and maintainability: Write clear, maintainable code first, and only optimize if benchmarks show a real need[2].
- Document optimization rationale: When making changes for performance, include comments explaining benchmark results and reasoning.
- Focus on reducing memory usage by simplifying data structures, merging similar elements, and using efficient storage formats.
- Testing implementation details: Verify public behavior, not internal fields. Refactors should not break tests when behavior is unchanged.
- Over-mocking: Prefer real dependencies when feasible. Mocks often assert calls instead of behavior.

## Techniques

- Avoid unnecessary work: Use memoization, laziness, and incremental computation to skip redundant calculations[2][1].
- Minimize allocations: Reuse variables and avoid creating unnecessary arrays or objects inside performance-critical code[2][1].
- Use appropriate data structures: Choose the right data structure for the use case (e.g., use `Set` for fast lookups instead of `Array.includes`)[2][3].
- Avoid string comparisons when possible: Prefer integer enums or symbols over strings for comparisons[2].
- Keep object shapes consistent: Create all objects with the same property order and types to help JS engines optimize access (monomorphic access)[2].
- Minimize indirection: Avoid proxies and deep property access in hot paths[2].
- Use simple loops: Prefer traditional `for` loops over higher-order functions like `forEach` or `map` for critical performance sections[2][3].
- Avoid array/object methods in hot code: Methods like `Object.values()` and `Array.map()` can create unnecessary copies and allocations[2].
- Reduce object property access: Cache object properties or array lengths outside of loops to avoid repeated lookups[2][6].
- Avoid large objects for frequent access: For large collections, prefer arrays or specialized structures over large plain objects[2].
- Minimize function calls in hot loops: Inline logic where possible to reduce overhead from frequent function calls inside tight loops[8].
- Cache DOM queries: Store references to DOM elements instead of repeatedly calling `document.getElementById`[6].
- Cache math functions if used frequently: Assign `Math` methods to local variables if they're called repeatedly in hot code[7].
- Debounce/throttle callback handlers

**Memory and Runtime Optimization**

- Manage closures carefully: Release references in closures when no longer needed to avoid memory leaks[5].
- Use WeakMap/WeakSet for cache: Store object metadata in `WeakMap` or `WeakSet` to allow garbage collection[5].
- Batch DOM updates: Use `DocumentFragment` to minimize DOM reflows when adding multiple elements[5].
- Monitor memory usage: Regularly profile memory and clean up event listeners or large objects when no longer needed[5].
- Implement object pooling: Reuse objects that are frequently created and destroyed to reduce garbage collection pressure[5].

**Advanced and Extreme Techniques**

- Avoid mutation-heavy string operations: Prefer string concatenation over mutation methods like `.replace()` or `.trim()` in hot paths[2].
- Specialize code for common cases: Write specialized code paths for the most common scenarios, but ensure maintainability[2].
- Minify and compress code for production: Use advanced minifiers (e.g., Closure Compiler in ADVANCED mode) to remove dead code, inline functions, and shrink payload size[4].
- Combine minification and gzip: Both together can reduce bandwidth and load time by up to 80-90%[4].
- Prefer sequential memory access: Operate on data sequentially to take advantage of CPU cache prefetching[2].
- Use TypedArrays for numeric data: TypedArrays can offer significant performance benefits for large numeric datasets[2].

**Memoization and Caching**

- Use memoization for expensive pure functions: Cache results of pure functions to avoid redundant calculations[1].
- Use fast, simple cache keys: For memoization, use primitive values or short strings as keys to improve cache lookup speed[1].

**Garbage Collection Pressure**

For benchmarks involving significant memory allocations, controlling garbage collection frequency can improve results consistency.

```typescript
// ❌ Bad: unpredictable gc pauses
bench(() => {
    const bigArray = new Array(1000000);
});

// ✅ Good: gc before each (batch-)iteration
bench(() => {
    const bigArray = new Array(1000000);
}).gc("inner"); // run gc before each iteration
```

**Loop Invariant Code Motion Optimization**

JavaScript engines can optimize away repeated computations by hoisting them out of loops or caching results. Use computed parameters to prevent loop invariant code motion optimization.

```typescript
bench(function* (ctx) {
    const str = "abc";

    // ❌ Bad: JIT sees that both str and 'c' search value are constants/comptime-known
    yield () => str.includes("c");
    // will get optimized to:
    /*
    yield () => true;
  */

    // ❌ Bad: JIT sees that computation doesn't depend on anything inside loop
    const substr = ctx.get("substr");
    yield () => str.includes(substr);
    // will get optimized to:
    /*
    const $0 = str.includes(substr);
    yield () => $0;
  */

    // ✅ Good: using computed parameters prevents jit from performing any loop optimizations
    yield {
        [0]() {
            return str;
        },

        [1]() {
            return substr;
        },

        bench(str, substr) {
            return do_not_optimize(str.includes(substr));
        },
    };
}).args("substr", ["c"]);
```

**Avoid Layout Thrashing:**

```ts
// ❌ Bad: Alternating reads and writes (causes reflows)
elements.forEach(el => {
  const height = el.offsetHeight; // Read (forces layout)
  el.style.height = height * 2; // Write
});

// ✅ Good: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2; // All writes
});
```

---

- Never optimize without measuring (premature optimization)
- Use "mitata" library for benchmarking tooling. Use context7 for learning more about it.

---

Citations:
[1] https://addyosmani.com/blog/faster-javascript-me
[2] https://romgrk.com/posts/optimizing-javascript
[3] https://www.phpied.com/extreme-javascript-optimization/
[4] https://news.ycombinator.com/item?id=10146903
[5] https://dev.to/chintanonweb/optimize-like-a-pro-javascript-memory-techniques-for-large-projects-j22
[6] https://stackoverflow.com/questions/1716266/javascript-document-getelementbyid-slow-performance
[7] https://stackoverflow.com/questions/7056838/javascript-optimization-caching-math-functions-globally
[8] https://www.scribd.com/document/35326708/2449719
[9] https://code.tutsplus.com/extreme-javascript-performance--net-15835t
[10] https://groups.diigo.com/group/web-performance
[11] https://caolan.uk/notes/2025-07-31_complex_iterators_are_slow.cm
[12] https://caolan.uk/notes/2023-07-28_smaller_javascript_using_encapsulation.cm
[13] https://medium.com/better-programming/low-hanging-web-performance-fruits-a-cheat-sheet-3aa1d338b6c1
[14] https://jpcamara.com/2023/03/07/making-tanstack-table.**html**

---
