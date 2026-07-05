---
name: self-review
description: Final self-review your own work before committing. Fight entropy, ensure quality, leave the codebase better than you found it.
---

You just finished some work. Before committing, step back and review it with a critical eye.

The goal is NOT to rubber-stamp what you did. The goal is to catch the shortcuts, the entropy, the "good enough" choices that erode a codebase over time. Every quick fix has a cost in maintainability. Fight that.

## What to do

1. **Gather all changes.** Run `git status` to see the full picture. Then run `git diff --cached` for all recently made staged changes. If the code you modified isn't staged, then stage it. Read every changed file fully — not just the diff hunks, but the surrounding context.

2. **Spawn a bug-finding subagent.** Launch a `general` subagent that calls the `find-bugs-diff` skill to review your changes for bugs, security vulnerabilities, and code quality issues. Do NOT call the `find-bugs-diff` skill yourself — delegate it entirely to the subagent. Wait for its report and address any findings.

3. **Read the quality standards.** Read these docs and review your work against each point:
   - `/AGENTS.md`

4. **Fix violations.** For every violation you find (including those reported by the subagent), fix it — don't just report it. If a fix would be too large or risky, flag it explicitly with what's wrong and why you're not fixing it now.

5. **Fight entropy.** Look at the code you touched and the code around it. Did you leave it better than you found it? Did you introduce complexity that isn't justified? Did you take a shortcut that a future reader will curse? If something nearby is already broken or messy and your change made it worse or left it as-is when a small improvement was obvious, fix it.

6. **Look for refactoring opportunities.** Actively ask yourself: what can be refactored in or around the code you touched to make it easier to maintain long term? Duplicated logic that should be extracted, unclear abstractions that should be simplified, tangled responsibilities that should be separated. Don't just preserve the status quo — improve it.

7. **Report.** After fixing everything, give a brief summary of what you changed and what you flagged.

**Do NOT stage the post-review fixes.** Leave them unstaged so the reviewer can inspect the fix diff separately from the original work. Staging them buries the fixes inside the original commit, making them invisible to review.

## The final question

Before you're done, ask yourself the three questions from the quality guide:

1. Did you do the hard thing, or take a shortcut that creates debt?
2. Would you be confident if this code ran at 10x the current load?
3. Will someone reading this in six months understand why it works this way?

If any answer is no, go back and fix it.
