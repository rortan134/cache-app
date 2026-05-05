---
name: unrepresentable-states
description: A guide on how to make invalid states unrepresentable.
---

Types define representable states; business logic defines valid states; bugs arise in the gap between them.

You can reduce bugs by shrinking the set of representable states rather than only handling more cases.

Designing types so representable states closely match valid states shifts many errors from runtime to compile time.

Domain-specific types (e.g., a ‎⁠Color⁠ enum instead of ‎⁠&str⁠) can ensure all representable states are valid and remove some runtime validation.

Encoding constraints in data structures (e.g., separating ‎⁠EditAction⁠ from ‎⁠Action⁠) makes illegal combinations untypeable and caught at compile time.

Modeling systems as typed state machines (e.g., ‎⁠Vpn<Disconnected | Connecting | Connected>⁠) lets the compiler enforce valid state transitions and initial states.

Not all illegal states must be unrepresentable, but more thoughtful type design systematically prevents more bugs earlier.
