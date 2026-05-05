---
name: state-derived-values
description: Prefer derived values over redundant state. Single source of truth, fewer variables, no desync bugs. Use when adding state, reviewing components, or designing data flow. Applies to React, backend services, and database design.
---

# State: Minimize State, Maximize Derived Values

## Core principle

If a value can be computed from existing data, do not store it in state. Derive it on demand.

**Bad (dual state, manual sync):**

```typescript
let count = 0
let doubled = 0
function setCount(value: number) {
  count = value
  doubled = value * 2
}
```

**Good (single source of truth):**

```typescript
let count = 0
const doubled = () => count * 2
```

## Benefits

- Single source of truth; no desynchronization
- Fewer variables to track and update
- Eliminates entire categories of bugs

## When to break

Only when performance clearly requires precomputation. **Investigate every new piece of state**—most are not needed.

---

## Examples by domain

### React

Derive values inline during render instead of storing them in state.

```tsx
// Bad
const [count, setCount] = useState(0)
const [doubled, setDoubled] = useState(0)
useEffect(() => setDoubled(count * 2), [count])

// Good
const [count, setCount] = useState(0)
const doubled = count * 2
```

With React Compiler enabled (as in this project), manual `useMemo` is unnecessary—the compiler automatically memoizes derived values. Only precompute if profiling proves the derivation itself is a bottleneck.

### Backend

Compute aggregates on demand with caching rather than storing denormalized copies.

```typescript
// Bad: duplicate total in DB/state, risk of drift
await db.order.update({ data: { total: computedTotal } })

// Good: derive from line items, cache if needed
const total = lineItems.reduce((s, i) => s + i.amount, 0)
```

### Database

Prefer views or materialized views over duplicating data across tables.

```sql
-- Bad: total stored in orders, can drift from line_items
-- Good: view derives from source
CREATE VIEW order_totals AS
  SELECT order_id, SUM(amount) AS total
  FROM line_items
  GROUP BY order_id;
```

Use materialized views when read performance justifies refresh cost.

---

## Checklist for new state

Before adding state, ask:

- [ ] Can this be derived from props, existing state, or fetched data?
- [ ] If derived: is the computation cheap enough to run on render/request?
- [ ] If precomputation needed: is the performance gain measurable and worth the extra complexity?
