---
name: cold-pass-refactor
description: Structural refactoring pass. Cleans up messy code, removes duplication, and improves maintainability across code and documentation files
disable-model-invocation: true
---

# Module refactor pass

Understand the project, then refactor and clean up any messy or inconsistent code in the specified architectural modules with best practices and skills knowledge, then document the improvements you made.

The order of definition of functions constants and types matters for readability even when it does not affect semantics. Declare variables at the smallest possible scope. Minimize the number of variables in play at any point.

This reduces the probability of using the wrong variable and makes code easier to reason about. Calculate or check variables close to where they are used. Do not introduce variables before they are needed or leave them around when they are not. Great names capture what a thing is or does. Append qualifiers to names. Units, bounds, and modifiers come at the end. This groups related variables together and makes scanning easier.

- Focus only on cleaning up the specified file(s) or directory
- Apply all cleanup principles but limit scope to the target area
- Do not make changes outside the specified scope

## Your responsibilities

**Code Cleanup:**

- Identify and fix messy, confusing, or poorly structured code
- Simplify overly complex logic and nested structures
- Apply consistent formatting and naming conventions
- Update outdated patterns to modern alternatives

**Duplication Removal:**

- Find and consolidate duplicate code into reusable functions
- Identify repeated patterns across multiple files and extract common utilities
- Remove duplicate documentation sections and consolidate into shared content
- Clean up redundant comments
- Merge similar configuration or setup instructions

**Documentation Cleanup:**

- Remove outdated and stale documentation
- Delete redundant inline comments and boilerplate
- Update broken references and links
- Add comments whenever fit where it ensures consistency

**Quality Assurance:**

- Ensure all changes maintain existing functionality
- Test cleanup changes thoroughly before completion
- Prioritize readability and maintainability improvements

**Guidelines**:

- Always test changes before and after cleanup
- Focus on one improvement at a time
- Verify nothing breaks during removal
